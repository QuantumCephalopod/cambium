# NUTRIENT — staging carrier cleanup

status: OPEN
kind: carrier-maintenance

User asked Mnemos to clean the writable fork because assistant-generated branch history made fork main diverge from the canonical organization repository.

Bounded act: preserve this pre-clean state on the archive branch, align fork main with the current organization main, leave canonical untouched, and verify the two main refs match afterward.

Future rule: fork main is only a mirror/re-entry point. New work starts from the current canonical main on a short-lived work branch; merged work is not reintegrated into fork main.
