const User = require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// Register a new user => /api/v1/register
exports.registerUser = catchAsyncErrors( async (req, res, next) => {
    const {name, email, password, role} = req.body;

    const user = await User.create({
        name,
        email,
        password,
        role
    });

    // // Create JWT web token
    // const token = user.getJwtToken();

    // res.status(200).json({
    //     success : true,
    //     message : 'user is registered.',
    //     token
    // })

    sendToken(user, 200, res);
});

// Login user => /api/v1/login
exports.loginUser = catchAsyncErrors( async (req, res, next) => {
    const {email, password} = req.body;

    // check if email and password entered by user
    if(!email || !password) {
        return next(new ErrorHandler('Please enter email & password.', 400));
    }

    // finding user in database
    const user = await User.findOne({email}).select('+password');
    if(!user) {
        return next(new ErrorHandler('Invalid Email or Password.', 401));
    }

    // Check if password is correct
    const isPasswordMatched = await user.comparePassword(password);
    if(!isPasswordMatched) {
        return next(new ErrorHandler('Invalid Email or Password.', 401));
    }

    // // Create JSON JWT web token
    // const token = user.getJwtToken();

    // res.status(200).json({
    //     success : true,
    //     token
    // })
    sendToken(user, 200, res);
});

// Forgot Password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors( async (req, res, next) => {
    const user = await User.findOne({email : req.body.email});

    // check user email in database
    if(!user){
        return next(new ErrorHandler('No user found with this email.', 404));
    }

    // get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave : false });

    //create reset Password url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;
    const message = `Your password reset link is as follow : \n\n${resetUrl}\n\n If you have not requested this, then please ignore that.`;

    try {
        await sendEmail({
            email : user.email,
            subject : 'Jobbee-API Password recovery',
            message
        });
    
        res.status(200).json({
            success : true,
            message : `Email sent successfully to ${user.email}`
        });
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save({ validateBeforeSave : false });

        return next(new ErrorHandler('Email is not sent'), 500);
    }

});

// Reset Password   =>   /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async(req, res, next) => {
    // Hash url token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    const user = await User.findOne({ 
        resetPasswordToken, 
        resetPasswordExpire: {$gt : Date.now() }
    });

    if(!user) {
        return next(new ErrorHandler('Password Reset token is invalid or has been expired.', 400));
    }

    // Setup new password
    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
});

// logout user => /api/v1/logout
exports.logout = catchAsyncErrors(async(req, res, next) => {
    res.cookie('token', 'none', {
        expires : new Date(Date.now()),
        httpOnly : true
    });

    res.status(200).json({
        success : true,
        message : 'Logged out successfully.'
    });

});