# Bible Quiz

A simple Android trivia game with multiple-choice Bible questions, score tracking, and a replay option.

## Build

The APK is built automatically by GitHub Actions on every push to `main` (see `.github/workflows/build.yml`). The built `app-debug.apk` is attached to the workflow run as an artifact and to a GitHub Release.

To build locally, open the project in Android Studio or run:

```
./gradlew assembleDebug
```
