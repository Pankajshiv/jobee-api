const express = require('express');
const app = express();

const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');
const bodyParser = require('body-parser');

const connectDatabase = require('./config/database');
const errorMiddleWare = require('./middlewares/errors');
const ErrorHandler = require('./utils/errorHandler');

//setting up config.env file variables
dotenv.config({path: './config/config.env'});

//handling uncaught exceptions
process.on('uncaughtException', err => {
    console.log(`ERROR: ${err.message}`);
    console.log(`Shutting down due to uncaught exception.`);
    process.exit(1);
})

//connecting to database
connectDatabase();

// setup body parser
app.use(bodyParser.urlencoded({ extended : true }));

app.use(express.static('public'));
//setup security headers
app.use(helmet());

//Setup body parser
app.use(express.json());

//set cookie parser
app.use(cookieParser());

//handle file uploads
app.use(fileUpload);

//sanitize data
app.use(mongoSanitize());

// prevent xss attacks
app.use(xssClean());

// prevent parameter pllution 
app.use(hpp({
    whitelist : ['positions']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs : 10*60*1000, //10 minutes
    max : 100
});
app.use(limiter);

// Setup CORS -- Accessible by other domains
app.use(cors());

// const middlware = (req, res, next) => {
//     console.log("hi from middleware");

//     //setting up user or any variable globally
//     //req.user = "pankaj kumar";
//     //req.requestMethod = req.method;
//     req.requestMethod = req.url;
//     next();
// }
// app.use(middlware);


//importing all routes

const jobs = require('./routes/jobs');
const auth = require('./routes/auth');
const user = require('./routes/user');

app.use('/api/v1', jobs);
app.use('/api/v1', auth);
app.use('/api/v1', user);

// Hnadle unhandled routes
app.all('*', (req, res, next) => {
    next(new ErrorHandler(`${req.originalUrl} route not found`, 404));
});

//middleware to handle errors
app.use(errorMiddleWare);

const PORT = process.env.PORT;
const server = app.listen(PORT, () => {
    console.log(`server started on port ${process.env.PORT} in ${process.env.NODE_ENV} mode.`);
});

// handling unhandled promise rejection
process.on('unhandledRejection', err =>{
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server due to unhandled promise rejection.`);
    server.close( () => {
        process.exit(1);
    });
});
