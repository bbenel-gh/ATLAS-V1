# Install ATLAS on an Android phone

For pilot and test phones. ATLAS is not on the Play Store. You install it from
a link that the build operator sends you. It takes about 5 minutes on Wi-Fi.

You need: the install link, the phone, and Wi-Fi (the file is large for mobile data).

1. On the phone, open the install link in Chrome. The page shows ATLAS and an **Install** button.
2. Tap **Install**. Chrome downloads a file ending in `.apk`. If Chrome warns that the file might be harmful, tap **Download anyway**. The file comes from our own build.
3. When the download finishes, tap **Open**.
4. If the phone says it cannot install unknown apps, tap **Settings**, turn on **Allow from this source** for Chrome, then press back.
5. Tap **Install**. If Play Protect asks to scan the app, tap **Scan app** or **Install anyway**.
6. Tap **Open**. You should see "Hello ATLAS" and the version number under it.
7. Check the version number matches the one in the message that came with the link.
8. To finish, go back to **Settings**, **Apps**, **Chrome**, **Install unknown apps**, and turn **Allow from this source** off again.

To update to a newer build, repeat the same steps with the new link. The app
updates in place. If the phone says the app is not installed because of a
conflict, tell the build operator before you uninstall anything.

Menu names differ slightly between phone makers. If a step looks different,
look for the closest match, or write what you saw in `ops/BUGS.md`.
