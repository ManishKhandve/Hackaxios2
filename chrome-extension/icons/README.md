# Chrome Extension Icons

The extension needs icon files in the `icons` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

## Quick Option: Create Simple Icons

You can use any image editor or online tool to create these icons.

### Using Python (if you have Pillow installed):

```python
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    img = Image.new('RGBA', (size, size), (102, 126, 234, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw a simple building/institution icon
    center = size // 2
    
    # Simple design - just colored square with gradient effect
    for i in range(size // 4):
        color = (102 + i*2, 126 + i, 234 - i, 255)
        draw.rectangle([i, i, size-i-1, size-i-1], outline=color)
    
    img.save(filename)

create_icon(16, 'icon16.png')
create_icon(48, 'icon48.png')
create_icon(128, 'icon128.png')
```

### Free Online Tools:
- https://favicon.io/favicon-generator/
- https://www.canva.com

### Recommended Design:
- Purple gradient background (#667eea to #764ba2)
- Building/form icon in white
- Simple and recognizable at 16px
