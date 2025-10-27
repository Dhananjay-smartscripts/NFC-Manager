#!/bin/bash

# Script to generate Android app icons from the mcards logo (optimized app icon version)
# Usage: ./scripts/generate-icons.sh

echo "Generating app icons from assets/mcards-icon-clean.png..."

# Create an optimized app icon with proper padding
convert assets/mcards-icon.png -background transparent -gravity center -extent 400x400 -resize 80% assets/mcards-app-icon.png

# Create a temporary square version of the logo for icons
convert assets/mcards-app-icon.png -background transparent -gravity center -extent 512x512 temp_square.png

# Generate different icon sizes for Android
echo "Creating standard icons..."
convert temp_square.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert temp_square.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert temp_square.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert temp_square.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert temp_square.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png

# Generate round icons
echo "Creating round icons..."
for size in "48:mdpi" "72:hdpi" "96:xhdpi" "144:xxhdpi" "192:xxxhdpi"; do
  pixels=$(echo $size | cut -d: -f1)
  density=$(echo $size | cut -d: -f2)
  convert temp_square.png -resize ${pixels}x${pixels} \
    \( +clone -threshold 101% -fill white -draw "circle $((pixels/2)),$((pixels/2)) $((pixels/2)),0" \) \
    -alpha off -compose copy_opacity -composite \
    android/app/src/main/res/mipmap-${density}/ic_launcher_round.png
done

# Clean up
rm temp_square.png

echo "✅ App icons generated successfully!"
echo "📱 New icons are ready in android/app/src/main/res/mipmap-*/"