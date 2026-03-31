# JC Rentals - Node.js Website

A modern Node.js website for property rentals using Express.js and EJS templating.

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone or navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Project

### Development Mode (with auto-reload)
```bash
npm run dev
```
This requires nodemon to be installed.

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## Project Structure

```
jc-rentals/
├── public/              # Static files (CSS, JavaScript, images)
│   ├── css/
│   ├── js/
│   └── images/
├── views/               # EJS templates
├── routes/              # Express routes
├── server.js            # Main application file
├── package.json         # Project dependencies
└── README.md            # This file
```

## Features

- Express.js server
- EJS templating engine
- Responsive CSS styling
- Multiple page routes (Home, About, Properties, Contact)

## Development

### Available Routes

- `/` - Home page
- `/about` - About page
- `/properties` - Properties listing
- `/contact` - Contact page

### Adding New Pages

1. Create a new `.ejs` file in the `views/` directory
2. Add a new route in `routes/index.js`
3. Add a navigation link in the header template

## License

ISC
