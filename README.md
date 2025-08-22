# test1

This code repository contains test files intended to trigger alerts (or not trigger alerts) from various tools (static analysis (SA) flaw-finding tools that alert for flaws such as CWEs, software composition analysis (SCA) tools that identify known-vulnerable software packages, and more).

The code comes from various sources:

* some was developed by myself, with GPT-5:
  * `hello.world.c`
  * `InferBuggyExample.java`
  * `objective-c-minimal.m`
  * `pom.xml`
  * `Makefile`
* some was developed by myself, with GPT-5, and purposely incorporates a noncompliant-code example from a rule in a SEI CERT coding standard:
  * `DeserializeExample.java` contains a noncompliant-code example from SER12-J at https://wiki.sei.cmu.edu/confluence/display/java/SER12-J.+Prevent+deserialization+of+untrusted+data
  * `NoncompliantCertExample.java` contains a bad-code example from STR00-J at https://wiki.sei.cmu.edu/confluence/display/java/STR00-J.+Don%27t+form+strings+containing+partial+characters+from+variable-width+encodings
* `main2.c` was copied from `main.c` from  this repository, with verbal permission from its author https://github.com/r-sei-test/scripting-test/blob/main/main.c
* `Dockerfile.prereq` comes from the Redemption APR Tool https://github.com/cmu-sei/redemption/blob/main/Dockerfile.prereq which has an MIT (SEI)-style license which permits this use
* some was copied from NIST SARD, with public domain or open-source licenses allowing this use:
  * `memory_leak_container.cpp` (example of CWE-401) from https://samate.nist.gov/SARD/test-cases/1967/versions/1.0.0
  * `OSCommandInjection_078.java` (example of CWE-78) from https://samate.nist.gov/SARD/test-cases/2084/versions/1.0.0
* `pygoat` was copied from its GitHub repo at https://github.com/adeyosemanputra/pygoat (its MIT License allows this use)
* some GitHub Actions workflows are taken from https://github.com/r-sei-test/test/tree/main/.github/workflows with their author's permission
* some GitHub Actions workflows have my edits combined with original files taken from https://github.com/r-sei-test/test/tree/main/.github/workflows with their author's permission to copy and edit them
  * `bandit.yml`
  * `scorecard.yml`
  * `semgrep.yml`
* some GitHub Actions workflows (in the `.github/workflows` directory) were developed by myself, with GPT-5
  * snyk-security.yml
  * infer.yml
  * clang-tidy.yml

