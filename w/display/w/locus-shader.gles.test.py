#!/usr/bin/env python3
"""Execute captured production-field GL commands on offscreen OpenGL ES.

The existing JS fixture supplies declared state/input. Mesa compiles/links and
executes the actual field/glass shaders and geometry at wide/narrow carriers.
This is a graphics contract test, not browser paint or physical-device timing.
"""
import ctypes as C
import ctypes.util
import json
import os
from pathlib import Path
import subprocess

I,U,F,P=C.c_int,C.c_uint,C.c_float,C.c_void_p
os.environ['LIBGL_ALWAYS_SOFTWARE']='1'
E=C.CDLL(ctypes.util.find_library('EGL') or 'libEGL.so.1')
E.eglGetProcAddress.restype=P;E.eglGetProcAddress.argtypes=[C.c_char_p]
def proc(name,ret,args):
    address=E.eglGetProcAddress(name.encode())
    if not address:raise RuntimeError('missing GL/EGL procedure '+name)
    return C.CFUNCTYPE(ret,*args)(address)
display=proc('eglGetPlatformDisplayEXT',P,[U,P,C.POINTER(I)])(0x31DD,None,None)
E.eglInitialize.argtypes=[P,C.POINTER(I),C.POINTER(I)]
major,minor=I(),I();assert E.eglInitialize(display,C.byref(major),C.byref(minor))
E.eglBindAPI.argtypes=[U];assert E.eglBindAPI(0x30A0)
attrs=(I*13)(0x3024,8,0x3023,8,0x3022,8,0x3033,1,0x3040,0x40,0x3025,24,0x3038)
config,count=P(),I();E.eglChooseConfig.argtypes=[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)]
assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(count)) and count.value
E.eglCreateContext.argtypes=[P,P,P,C.POINTER(I)];E.eglCreateContext.restype=P
context=E.eglCreateContext(display,config,None,(I*3)(0x3098,3,0x3038));assert context
E.eglMakeCurrent.argtypes=[P,P,P,P];assert E.eglMakeCurrent(display,None,None,context)

cache={}
def gl(name,ret,args,*values):
    if name not in cache:cache[name]=proc('gl'+name,ret,args)
    return cache[name](*values)
def gen(kind):
    out=U();gl('Gen'+kind,None,[I,C.POINTER(U)],1,C.byref(out));return out.value
def attach_screen(width,height):
    fb=gen('Framebuffers');gl('BindFramebuffer',None,[U,U],36160,fb)
    color=gen('Renderbuffers');gl('BindRenderbuffer',None,[U,U],36161,color)
    gl('RenderbufferStorage',None,[U,U,I,I],36161,32856,width,height)
    gl('FramebufferRenderbuffer',None,[U,U,U,U],36160,36064,36161,color)
    depth=gen('Renderbuffers');gl('BindRenderbuffer',None,[U,U],36161,depth)
    gl('RenderbufferStorage',None,[U,U,I,I],36161,33190,width,height)
    gl('FramebufferRenderbuffer',None,[U,U,U,U],36160,36096,36161,depth)
    assert gl('CheckFramebufferStatus',U,[U],36160)==36053
    return fb

simple={
 'AttachShader':[U,U],'CompileShader':[U],'LinkProgram':[U],'UseProgram':[U],
 'BindVertexArray':[U],'BindBuffer':[U,U],'EnableVertexAttribArray':[U],'VertexAttribDivisor':[U,U],
 'BindTexture':[U,U],'BindRenderbuffer':[U,U],
 'BlendEquation':[U],'ActiveTexture':[U],'Enable':[U],'Disable':[U],'BlendFunc':[U,U],
 'DepthMask':[C.c_ubyte],'ColorMask':[C.c_ubyte]*4,'ClearDepthf':[F],
 'ClearColor':[F]*4,'Clear':[U],'Viewport':[I]*4,'DrawArrays':[U,I,I],
 'TexParameteri':[U,U,I],'TexStorage2D':[U,I,U,I,I],
 'TexStorage3D':[U,I,U,I,I,I],'DrawArraysInstanced':[U,I,I,I],'DepthFunc':[U],
 'BlendFuncSeparate':[U]*4,'GenerateMipmap':[U],
 'RenderbufferStorage':[U,U,I,I],'RenderbufferStorageMultisample':[U,I,U,I,I],
 'FramebufferRenderbuffer':[U,U,U,U],'FramebufferTexture2D':[U,U,U,U,I],
 'BlitFramebuffer':[I]*8+[U,U],
 'DeleteProgram':[U],'DeleteShader':[U],
}
def replay(commands,width,height,min_depth_clears=3):
    # Each browser canvas owns a fresh context; do not leak a preceding replay's
    # enable/write state into the next declared consumer context.
    for flag in (3042,2929,3089,2960,2884):gl('Disable',None,[U],flag)
    gl('DepthMask',None,[C.c_ubyte],True);gl('ColorMask',None,[C.c_ubyte]*4,True,True,True,True)
    gl('DepthFunc',None,[U],513);gl('ClearDepthf',None,[F],1);gl('ActiveTexture',None,[U],33984)
    screen=attach_screen(width,height);objects={};images=[];programs=0;depth_clears=0
    bindings={}
    for cmd in commands:
        if cmd['name']=='getAttribLocation' and isinstance(cmd.get('result'),int) and cmd['result']>=0:
            bindings.setdefault(cmd['args'][0]['object'],{})[cmd['args'][1]]=cmd['result']
    def value(arg):
        if isinstance(arg,dict) and 'object' in arg:return objects[arg['object']]
        if arg is None:return 0
        return arg
    for index,cmd in enumerate(commands):
        name=cmd['name'];a=cmd.get('args',[]);result=cmd.get('result')
        if name=='clear' and a[0]&256:
            writes=C.c_ubyte();gl('GetBooleanv',None,[U,P],2930,C.byref(writes))
            assert writes.value and not gl('IsEnabled',C.c_ubyte,[U],3089),'actual GL depth clear was masked/scissored'
            depth_clears+=1
        if name=='readback':
            gl('BindFramebuffer',None,[U,U],36160,screen)
            pixels=(C.c_ubyte*(width*height*4))()
            gl('ReadPixels',None,[I,I,I,I,U,U,P],0,0,width,height,6408,5121,pixels)
            images.append((bytes(pixels),cmd['lens']));continue
        if name in {'getAttribLocation','getUniformLocation','getShaderParameter','getProgramParameter','getParameter','checkFramebufferStatus'}:continue
        if name.startswith('create'):
            kind=name[6:]
            obj=gl('Create'+kind,U,[U] if kind=='Shader' else [],*map(value,a)) if kind in {'Shader','Program'} else gen({'VertexArray':'VertexArrays','Buffer':'Buffers','Texture':'Textures','Framebuffer':'Framebuffers','Renderbuffer':'Renderbuffers'}[kind])
            objects[result['object']]=obj
        elif name=='shaderSource':
            text=C.c_char_p(a[1].encode());gl('ShaderSource',None,[U,I,C.POINTER(C.c_char_p),P],value(a[0]),1,C.byref(text),None)
        elif name in {'compileShader','linkProgram'}:
            obj=value(a[0])
            if name=='linkProgram':
                for label,location in bindings.get(a[0]['object'],dict(zip(['aPos','aNormal','aRegion','aKind','aHot'],range(5)))).items():gl('BindAttribLocation',None,[U,U,C.c_char_p],obj,location,label.encode())
            gl(name[0].upper()+name[1:],None,[U],obj)
            ok=I();kind='Shader' if name=='compileShader' else 'Program'
            gl('Get'+kind+'iv',None,[U,U,C.POINTER(I)],obj,35713 if kind=='Shader' else 35714,C.byref(ok))
            if not ok.value:
                log=C.create_string_buffer(16000);gl('Get'+kind+'InfoLog',None,[U,I,P,P],obj,len(log),None,log)
                raise AssertionError(log.value.decode())
            if kind=='Program':programs+=1
        elif name=='bindFramebuffer':gl('BindFramebuffer',None,[U,U],a[0],value(a[1]) or screen)
        elif name=='bufferData':
            data=None if isinstance(a[1],int) else (F*len(a[1]['array']))(*a[1]['array'])
            gl('BufferData',None,[U,C.c_ssize_t,P,U],a[0],a[1] if data is None else C.sizeof(data),data,a[2])
        elif name=='bufferSubData':
            values=a[2]['array'];values=values[a[3]:a[3]+a[4]] if len(a)>4 else values
            data=(F*len(values))(*values);gl('BufferSubData',None,[U,C.c_ssize_t,C.c_ssize_t,P],a[0],a[1],C.sizeof(data),data)
        elif name=='vertexAttribPointer':gl('VertexAttribPointer',None,[U,I,U,C.c_ubyte,I,P],*a[:5],P(a[5]))
        elif name.startswith('uniform'):
            loc=a[0];location=gl('GetUniformLocation',I,[U,C.c_char_p],objects[loc['program']],loc['uniform'].encode())
            kind=name[7:]
            if kind=='Matrix4fv':
                data=(F*len(a[2]['array']))(*a[2]['array']);gl('UniformMatrix4fv',None,[I,I,C.c_ubyte,P],location,len(data)//16,a[1],data)
            elif kind.endswith('fv'):
                size=int(kind[0]);data=(F*len(a[1]['array']))(*a[1]['array']);gl('Uniform'+kind,None,[I,I,P],location,len(data)//size,data)
            else:gl('Uniform'+kind,None,[I]+([I] if kind=='1i' else [F]*int(kind[0])),location,*a[1:])
        elif name=='texSubImage2D':
            data=(C.c_ubyte*len(a[8]['array']))(*a[8]['array'])
            gl('TexSubImage2D',None,[U,I,I,I,I,I,U,U,P],*a[:8],data)
        elif name=='texSubImage3D':
            image=a[10]['image'];raw=Path(image['path']).read_bytes()
            assert len(raw)==image['width']*image['height']*4
            data=(C.c_ubyte*len(raw)).from_buffer_copy(raw)
            gl('TexSubImage3D',None,[U,I,I,I,I,I,I,I,U,U,P],*a[:10],data)
        elif name=='texImage2D':
            if len(a)==6:
                w=a[5]['image']['width'];h=a[5]['image']['height']
                raw=Path(a[5]['image']['path']).read_bytes() if a[5]['image'].get('path') else bytes([80,160,220,255])*(w*h)
                assert len(raw)==w*h*4
                data=(C.c_ubyte*len(raw)).from_buffer_copy(raw)
                vals=[a[0],a[1],a[2],w,h,0,a[3],a[4],data]
            else:
                data=None if a[8] is None else (C.c_ubyte*len(a[8]['array']))(*a[8]['array']);vals=a[:8]+[data]
            gl('TexImage2D',None,[U,I,I,I,I,I,U,U,P],*vals)
        elif name=='pixelStorei':
            if a[0] not in {37440,37441}:gl('PixelStorei',None,[U,I],*a)
        elif name.startswith('delete') and name not in {'deleteProgram','deleteShader'}:
            plural={'deleteVertexArray':'VertexArrays','deleteBuffer':'Buffers','deleteTexture':'Textures','deleteFramebuffer':'Framebuffers','deleteRenderbuffer':'Renderbuffers'}[name]
            obj=U(value(a[0]));gl('Delete'+plural,None,[I,C.POINTER(U)],1,C.byref(obj))
        else:
            upper='ClearDepthf' if name=='clearDepth' else name[0].upper()+name[1:]
            if upper not in simple:raise AssertionError('unsupported captured call '+name)
            gl(upper,None,simple[upper],*map(value,a))
        error=gl('GetError',U,[])
        assert error==0,f'GL error {error:#x} at {index}: {name}'
    assert depth_clears>=min_depth_clears,'repeated source frames did not exercise actual depth clearance'
    return images,programs

def main():
    results=[]
    for width,height in [(1280,800),(390,844)]:
        runs=[];programs=0
        for preview,magnification in [(0,.12),(1,.12),(1,0)]:
            capture=subprocess.check_output(['node',str(Path(__file__).with_name('locus-shader.gles-capture.cjs')),str(width),str(height),str(preview),str(magnification)],text=True)
            images,n=replay(json.loads(capture),width,height);programs+=n;runs.append(images)
        changes=outside=0
        for (base,lens),(fine,_) in zip(runs[0],runs[1]):
            for y in range(height):
                for x in range(width):
                    p=(y*width+x)*4
                    if base[p:p+4]==fine[p:p+4]:continue
                    changes+=1
                    if (x+.5-lens['x'])**2+(height-y-.5-lens['y'])**2>(lens['r']+2)**2:outside+=1
        assert changes>100,'the offered interior did not reach the actual glass pass'
        assert outside==0,f'{outside} preview pixels escaped the shared lens'
        optics_pixels=[]
        for (magnified,lens),(plain,_) in zip(runs[1],runs[2]):
            core=0
            for y in range(height):
                for x in range(width):
                    if (x+.5-lens['x'])**2+(height-y-.5-lens['y'])**2>(lens['r']*.5)**2:continue
                    p=(y*width+x)*4
                    if magnified[p:p+4]!=plain[p:p+4]:core+=1
            assert core>100,'opaque preview interior bypassed the active shared optical mapping'
            optics_pixels.append(core)
        assert any(runs[0][-1][0]),'field did not paint'
        results.append({'carrier':[width,height],'linked_programs':programs,'preview_changed_pixels':changes,'outside_lens_changed_pixels':outside,'interior_optics_changed_pixels':optics_pixels,'frames_per_mode':len(runs[0]),'actual_depth_clears_unmasked':True})
    print(json.dumps({'status':'PASS','backend':gl('GetString',C.c_char_p,[U],7937).decode(),'gles':gl('GetString',C.c_char_p,[U],7938).decode(),'actual_source':'locus-shader.js','cases':results,'scope':'Actual shaders/mesh/passes on software GLES with declared fixture state and procedural preview input; not browser layout, physical GPU or device FPS.'}))

if __name__=='__main__':main()
