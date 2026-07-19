# Third-party credits — AITA mobile

## gtsm-app

The login screen (`src/app/login.tsx`, `src/components/LoginField.tsx`) and its animation
asset (`src/assets/login_animation.json`) are ported from **gtsm-app**:

- Source: https://github.com/TinNK3/gtsm-app
- Origin of the ported files: `app/src/main/java/com/debk007/gstm/presentation/screen/LoginScreen.kt`
  and `app/src/main/res/raw/login_animation.json`
- Licence: **MIT**, Copyright (c) 2023 Debashish Kundu

MIT permits this reuse and requires the copyright notice and permission notice be retained,
which is what this file is for. The full licence text ships with the upstream repository.

**Ported:** the vertical `#E3F2FD → #BBDEFB → #42A5F5` gradient ground, the 180dp Lottie, the
32sp/Bold heading, the white radius-24 sheet, the `AnimatedTextField` focus behaviour
(border `Gray200 1dp → 2dp`, shadow lift, 200ms tween), the remember-me row, the radius-16 /
56pt button, and the error card.

**Changed for AITA:** the action colour (`#495ECA`, AITA's primary, so login matches the
dashboard — gtsm uses `#0047AB`), and all copy.

> The Lottie JSON carries no embedded author metadata of its own. If it was sourced from a
> third party (e.g. LottieFiles) rather than authored for gtsm-app, its original licence may
> apply on top of gtsm's MIT — worth confirming before shipping to production.
