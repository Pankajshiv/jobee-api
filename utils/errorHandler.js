class ErrorHandler extends Error{
    constructor(message, statusCode){
        super(message); //parent class constructor
        this.statusCode = statusCode;

        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = ErrorHandler;
