# Encounter: empty return on touch

Source pressure: the navigation/body-contact encounter requests two outside clicks to return and a global rule following the long axis.

On the integrated staging source 7ff1fb8ce1adf168cede3e553cca80aa7b0dafa3, a real Chromium touch-enabled 390×844 carrier received two adjacent taps on empty Philosophy canvas. The first tap stayed at `w`; the second also stayed at `w`. Chromium delivered two touch pointer/click sequences but no `dblclick`. Thus the desktop-only event does not realize the same empty-contact operation for touch. One tap must stay inert; two genuine, adjacent empty taps should request exactly one owner-local return. Real body contact, drags, cancellation, intervening input and slower/distinct taps must not accidentally return.

This is a browser-emulated touchscreen counterexample, not a physical-device witness. Papers owns its own canvas contact and receives its own local intake for the shared operation.
