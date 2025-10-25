# Ad System Updates

## Changes Made

### 1. File Upload Support
- Added file upload option to `AddAdModal` component
- Created `/api/ads/upload` endpoint for handling file uploads
- Files are stored in `uploads/ads/` directory
- Added static file serving via `/api/uploads/[...path]` route

### 2. Optional Link URL
- Made `link_url` field optional in ad creation
- Updated form validation to only require `title` and `image_url`
- Updated display components to handle ads without links

### 3. Database Schema Update Required
The `link_url` column in the `ads` table should allow NULL values:

```sql
ALTER TABLE ads ALTER COLUMN link_url DROP NOT NULL;
```

### 4. File Upload Features
- Maximum file size: 5MB
- Supported formats: All image types (jpg, png, gif, webp, svg)
- Files are stored with timestamp-based naming
- Automatic content-type detection for proper serving

### 5. UI Improvements
- Added image preview in the form
- File upload with drag-and-drop support
- Clear file option
- Better error handling and validation messages

## Usage
1. Admin can now upload image files directly or use image URLs
2. Link URL is optional - ads can be created without destination links
3. Uploaded files are automatically served via `/uploads/ads/filename`
4. All existing functionality remains unchanged
