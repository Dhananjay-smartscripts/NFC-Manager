# Assets Documentation

## Logo Files

### Main Logo Files

- `mcards.png` - Original logo (720x254) - Dark version for light backgrounds
- `mcards-white.png` - White version of the logo for dark backgrounds
- `mcards-light.png` - Light version (alternative white version)

### App Icon Files

- `mcards-icon-clean.png` - Cropped version showing just the 'm' logo without full text
- `mcards-app-icon.png` - Optimized version for app icons with proper padding

## Usage

### In React Native App

The app automatically switches between dark and light logo versions:

```jsx
<Image
  source={
    isDarkMode
      ? require('./assets/mcards-white.png')
      : require('./assets/mcards.png')
  }
  style={styles.logo}
  resizeMode="contain"
/>
```

### App Icons

App icons are generated using the `scripts/generate-icons.sh` script:

```bash
./scripts/generate-icons.sh
```

This creates icons in all required Android densities:

- mdpi: 48x48px
- hdpi: 72x72px
- xhdpi: 96x96px
- xxhdpi: 144x144px
- xxxhdpi: 192x192px

Both standard and round versions are created automatically.

## Design Guidelines

### Logo Display

- Use white version (`mcards-white.png`) for dark backgrounds
- Use original version (`mcards.png`) for light backgrounds
- Maintain aspect ratio with `resizeMode="contain"`

### App Icons

- Icons use the cropped version to avoid text being too small
- Include appropriate padding for visual balance
- Support both standard and round icon formats
- Follow Android icon design guidelines
