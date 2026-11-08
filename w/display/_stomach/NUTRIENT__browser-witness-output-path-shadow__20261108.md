# Browser witness output-path shadowing

status: OPEN
owner: display
source_intake: _stomach/NUTRIENT__browser-witness-output-path-shadow__20261108.md
source_revision: cae81a93927e176204ee02599ee61e64e6c139cc

The actual staging membrane witness reuses its parsed-argument binding `a` for rectangle comparisons and later expects `a.out`; its final evidence write may therefore fail. Keep the argument object distinct, retain all actual geometry and interaction checks, and witness the output-path correction without claiming the unobserved GitHub Actions run succeeded.
