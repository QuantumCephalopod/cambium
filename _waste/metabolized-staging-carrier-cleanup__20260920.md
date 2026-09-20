# NUTRIENT — staging carrier cleanup

status: OPEN
kind: carrier-maintenance

User asked Mnemos to clean the writable fork because assistant-generated branch history made fork main diverge from the canonical organization repository.

Bounded act: preserve this pre-clean state on the archive branch, align fork main with the current organization main, leave canonical untouched, and verify the two main refs match afterward.

Future rule: fork main is only a mirror/re-entry point. New work starts from the current canonical main on a short-lived work branch; merged work is not reintegrated into fork main.


## closure witness

- pre-clean fork main preserved by this archive branch from commit `41cdfdea846e0b298e6d5c86a48f485178aef005`;
- active fork main was reset to canonical organization main `62ad3dd3955d1a44e0349bdff9d8a5b8c40c69b6`;
- post-state compare: `identical`, ahead=0, behind=0;
- canonical organization repository was not mutated by the cleanup act;
- historical branches remain untouched because current connected GitHub actions expose no branch-delete mutation and their live/archival status is not uniformly known.
