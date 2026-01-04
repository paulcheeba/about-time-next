# About Time Next — Release Notes v13.2.0.0

**Release Date:** November 22, 2025  
**Foundry VTT Compatibility:** v13

---

## What's New

### Event Notification Sounds 🎵 

Never miss a scheduled event again! This release introduces an optional audible notification system for GMs:

- **Automatic Playback:** Sounds play when scheduled events trigger, alerting you without needing to watch the Event Manager
- **Customizable:** Choose from 3 included notification sounds or use your own audio files
- **Volume Control:** Adjust notification volume independently (0-100%) without affecting other game sounds
- **Test Before Saving:** Preview your sound selection and volume before committing changes
- **Non-Intrusive:** Enable/disable anytime via module settings, works seamlessly with repeating events

**New Settings (Client-Side):**
- Enable Event Notification Sound — Toggle on/off
- Sound Source — Built-in or custom
- Custom Sound Path — File picker with default path to module sounds
- Notification Volume — 0-100% slider
- Test Sound — Button to preview current selection

**Technical Details:**
- GM-only feature (matches ATN's design philosophy)
- Hook-based detection using pattern matching on chat messages
- Settings apply immediately after saving (no reload required)
- Works with repeating events — change settings mid-session while events continue to trigger

---

## Installation

**Manifest URL:**
```
https://github.com/paulcheeba/about-time-next/releases/latest/download/module.json
```

Or search for **"About Time Next"** in Foundry's module browser.

---

## Configuration

After updating, open **Configure Settings → About Time Next** to find the new **Event Notification Sounds** section at the bottom of the settings panel.

**Recommended Setup:**
1. Enable event notification sound
2. Select sound source (built-in is fine for most users)
3. Adjust volume to comfortable level (default: 40%)
4. Click **Test Sound** to preview
5. Click **Save Changes** to apply

**Custom Sounds:**
- Change sound source to "Custom"
- Click file picker button
- Navigate to your audio file (MP3, OGG, WAV supported)
- Test and save

---

## Credits

**Sound Effects:** All 3 included notification sounds are courtesy of [Notification_Message](https://pixabay.com/users/notification_message-47259947/) from [Pixabay](https://pixabay.com/sound-effects/) (Pixabay License).

---

## Known Issues

None reported for v13.2.0.0. If you encounter issues, please report them on the [GitHub Issues](https://github.com/paulcheeba/about-time-next/issues) page.

---

## Full Changelog

See [changelog.md](https://github.com/paulcheeba/about-time-next/blob/main/changelog.md) for complete version history.

---

## Acknowledgments

Originally created by **Tim Posney**, maintained for FVTT v13+ by **paulcheeba** with community feedback and AI-assisted development.

---

## License

MIT License — see [LICENSE](https://github.com/paulcheeba/about-time-next/blob/main/LICENSE) file.
