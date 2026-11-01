# Inspectra 2.0 Frontend

AI-powered industrial quality inspection and defect detection platform frontend.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Lucide React** - Icon library
- **CSS** - Styling (no external CSS framework)

## Project Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── api/            # API client and endpoints
│   │   ├── client.js
│   │   ├── endpoints.js
│   │   └── mockData.js
│   ├── components/     # Reusable components
│   │   ├── common/     # Buttons, badges, cards, etc.
│   │   ├── inspection/ # Inspection-specific components
│   │   └── layout/     # Layout components (Sidebar, Header)
│   ├── pages/          # Page components
│   │   ├── Overview.jsx
│   │   ├── NewInspection.jsx
│   │   ├── InspectionHistory.jsx
│   │   ├── Analytics.jsx
│   │   ├── ModelPerformance.jsx
│   │   └── Settings.jsx
│   ├── utils/          # Utility functions
│   │   ├── constants.js
│   │   └── formatters.js
│   ├── App.jsx         # Root component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── package.json
├── vite.config.js
└── index.html
```

## Features Implemented

### Pages
1. **Overview** - Dashboard with statistics, charts, and recent inspections
2. **New Inspection** - Upload images and run AI defect detection
3. **Inspection History** - Searchable and filterable inspection logs
4. **Analytics** - Comprehensive metrics and trend analysis
5. **Model Performance** - Technical model specifications and evaluation metrics
6. **Settings** - System configuration and preferences

### Components
- **Layout**: Sidebar navigation, header with breadcrumbs and search
- **Common**: Buttons, stat cards, status badges, loading spinners, empty states
- **Inspection**: Image uploader, defect visualization with bounding boxes, inspection results

### Key Features
- ✅ Professional light-theme industrial design
- ✅ Responsive layout (desktop, tablet, mobile)
- ✅ AI defect visualization with colored bounding boxes
- ✅ Interactive charts and analytics
- ✅ Mock data for development and demonstration
- ✅ Clean 8px spacing system
- ✅ Rubik + Roboto Mono typography
- ✅ Consistent color palette

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Backend Integration

The frontend is configured to proxy API requests to `http://localhost:8000`.

Expected backend endpoints:
- `POST /api/inspections` - Upload image and run inspection
- `GET /api/inspections` - Get inspection history
- `GET /api/inspections/{id}` - Get single inspection
- `GET /api/analytics/overview` - Dashboard statistics
- `GET /api/analytics/defect-trends` - Defect distribution
- `GET /api/model/performance` - Model metrics
- `GET /uploads/{filename}` - Serve uploaded images

Currently using **mock data** for development until backend APIs are implemented.

## Design System

### Color Palette
- Background: `#F4F7FA`
- Cards: `#FFFFFF`
- Primary Navy: `#172B4D`
- Primary Blue: `#2563EB`
- Success Green: `#16A36A`
- Warning Amber: `#E99A21`
- Danger Red: `#E5484D`
- Review Purple: `#8957D5`

### Typography
- **Rubik**: UI elements, headings, body text
- **Roboto Mono**: Technical data, IDs, metrics

### Spacing
8px baseline grid (4px, 8px, 16px, 24px, 32px, 48px)

## Important Notes

1. **Mock Data**: The application uses realistic mock data generators in `api/mockData.js` for development.

2. **Defect Visualization**: The AI detection visualization uses SVG overlays to display bounding boxes over uploaded images.

3. **No Backend Required**: The frontend can run standalone for UI/UX demonstration.

4. **API Integration**: When backend is ready, swap mock data calls with actual API calls in page components.

5. **Image Upload**: Currently stores images in browser memory (base64). Backend should handle file uploads and storage.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Development Notes

- Hot module replacement (HMR) is enabled
- React DevTools compatible
- All styling is custom CSS (no Tailwind, Bootstrap, etc.)
- Component structure follows atomic design principles
- Mock data simulates realistic API delays and responses
