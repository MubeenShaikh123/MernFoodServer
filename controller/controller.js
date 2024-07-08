const { validationResult } = require('express-validator');
const { User, Otp, Menu } = require('../Model/schema');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');
const nodemailer = require('nodemailer');
const getOrSetCache=require('../Redis/redis')

// Define the sendMail function
const sendMail = (to, subject, text) => {
  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });
    const mailOptions = {
      from: 'abc@gmail.com',
      to: to,
      subject: subject,
      text: text,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject(error);
      } else {
        resolve(info);
      }
    });
  });
};

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse = [];
    errors.array().forEach(error => {
      switch (error.msg) {
        case 'Name must be at least 4 characters long':
          errorResponse.push({ field: 'name', message: 'Username is too short' });
          break;
        case 'Invalid email format':
          errorResponse.push({ field: 'email', message: 'Invalid email format' });
          break;
        case 'Password must be at least 8 characters long':
          errorResponse.push({ field: 'password', message: 'Password is too short' });
          break;
        default:
          errorResponse.push({ field: 'unknown', message: 'Unknown validation error' });
          break;
      }
    });
    return res.status(400).json({ error: errorResponse });
  }

  if (!req.body) {
    return res.status(400).json({ error: [{ message: 'All fields are mandatory' }] })
  }
  const { email, password, name, location } = req.body

  try {
    const existingUser = await User.findOne({ email: req.body.email })

    if (existingUser) {
      return res.status(409).json({ error: [{ field: 'name', message: "User with given email already exist" }] })
    }
    const hashpass = await bcryptjs.hashSync(password)
    const newUser = new User({
      name: name,
      email: email,
      password: hashpass,
      location: location
    });

    newUser
      .save()
      .then(register => {
        res.json({ email: register.email, name: register.name });
      })
      .catch(error => {
        res.status(406).json({ error: [{ message: error.message || "Something Went Wong In Database" }] });
      });
  } catch (err) {
    res.status(500).json({ error: [{ message: err.message || "Error in register" }] });
  }
}

exports.login = async (req, res) => {
  const { email, password } = req.body
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorResponse = []

    errors.array().forEach(error => {
      switch (error.msg) {
        case "Email Format Error":
          errorResponse.push({ field: "email", message: "Invalid email format" })
          break;
        case "Password must be at least 8 characters long":
          errorResponse.push({ field: 'password', message: 'Password is too short' });
          break;

        default:
          errorResponse.push({ field: 'unknown', message: 'Unknown validation error' });
          break;
      }
    })
    return res.status(400).json({ error: errorResponse });
  }
  const document = await User.findOne({ email: email });

  if (!document) {
    return res.status(401).json({ error: [{ field: "email", message: "Invalid email" }] });
  }

  const isMatch = await bcryptjs.compare(password, document.password)
  if (!isMatch) {
    return res.status(400).json({ error: [{ field: "password", message: 'Incorrect password' }] })
  }
  const token = jwt.sign({ id: document._id, email: document.email }, process.env.JWT, { expiresIn: '1h' });
  const name = document.name
  return res.json({ token, email, name })

}

exports.authenticate = async (req, res) => {
  if (req.user) {
    const email = req.user.email;
    return res.json({ email })
  }
  return res.status(401).json({ error: 'Invalid or missing token' });
}

exports.foodCategory = async (req, res) => {
  try {
    const data = await getOrSetCache('foodCategory', async () => {
      const collection = mongoose.connection.collection('foodCategory');
      return await collection.find({}).toArray();
    });

    return res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.fooditem = async (req, res) => {
  try {
    const data = await getOrSetCache("fooditem", async () => {
      const collection = mongoose.connection.collection('food_items')
      return await collection.find({}).toArray()
    });

    return res.json(data)
  }
  catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}

exports.storedata = async (req, res) => {
  try {
    const { username } = req.query;
    const collection = mongoose.connection.collection('menus')

    const data = await collection.find({ username }).toArray()
    return res.json(data)
  }
  catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}

exports.sendOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse = [];

    errors.array().forEach((error) => {
      switch (error.msg) {
        case "Invalid Email Format":
          errorResponse.push({ field: "email", message: "Invalid Email Format" });
          break;
        default:
          errorResponse.push({ field: "unknown", message: "Unknown validation error" });
      }
    });
    return res.status(400).json({ error: errorResponse });
  }

  const userMail = req.body.email;
  const otp = String(Math.floor(Math.random() * 9000) + 1000);
  // Check if a user with the provided email exists in the database
  User.findOne({ email: userMail })
    .then((existingUser) => {
      if (existingUser) {
        // User exists, continue with OTP operations
        return Otp.findOne({ email: userMail });
      } else {
        // User does not exist, return an error
        return Promise.reject('User not found');
      }
    })
    .then((existingOtp) => {
      if (existingOtp) {
        // OTP exists, update it
        existingOtp.otp = otp;
        existingOtp.used = false;
        existingOtp.date = new Date();
        return existingOtp.save();
      } else {
        // OTP does not exist, create a new record
        const newOtp = new Otp({
          email: userMail,
          otp: otp,
          used: false,
        });
        return newOtp.save();
      }
    })
    .then(() => {
      // Send the email using the sendMail function
      const subject = 'OTP for your account';
      const body = `Your OTP is: ${otp}`;
      return sendMail(userMail, subject, body);
    })
    .then(() => {
      res.json({ message: 'OTP Sent Successfully' });
    })
    .catch((error) => {
      if (error === 'User not found') {
        res.status(404).json({ error: [{ message: 'User not found' }] });
      } else {
        res.status(406).json({ error: [{ message: 'Error sending OTP' }] });
      }
    });
};

exports.sendOtpUnregistered = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse = [];
    errors.array().forEach(error => {
      switch (error.msg) {
        case 'Name must be at least 4 characters long':
          errorResponse.push({ field: 'name', message: 'Username is too short' });
          break;
        case 'Invalid email format':
          errorResponse.push({ field: 'email', message: 'Invalid email format' });
          break;
        case 'Password must be at least 8 characters long':
          errorResponse.push({ field: 'password', message: 'Password is too short' });
          break;
        case 'Add valid location':
          errorResponse.push({ field: 'location', message: 'Location required' });
          break;
        default:
          errorResponse.push({ field: 'unknown', message: 'Unknown validation error' });
          break;
      }
    });
    return res.status(400).json({ error: errorResponse });
  }

  const userMail = req.body.email;
  const otp = String(Math.floor(Math.random() * 9000) + 1000);

  // Check if an OTP with the provided email exists in the database
  Otp.findOne({ email: userMail })
    .then((existingOtp) => {
      if (existingOtp) {
        // OTP exists, update it
        existingOtp.otp = otp;
        existingOtp.used = false;
        existingOtp.date = new Date();
        return existingOtp.save();
      } else {
        // OTP does not exist, create a new record
        const newOtp = new Otp({
          email: userMail,
          otp: otp,
          used: false,
        });
        return newOtp.save();
      }
    })
    .then(() => {
      // Send the email using the sendMail function
      const subject = 'OTP for your account';
      const body = `Your OTP is: ${otp}`;
      return sendMail(userMail, subject, body);
    })
    .then(() => {
      res.json({ message: 'OTP Sent Successfully' });
    })
    .catch((error) => {
      res.status(406).json({ error: [{ message: 'Error sending OTP' }] });
    });
};

exports.verifyOtp = async (req, res) => {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse = [];

    errors.array().forEach((error) => {
      switch (error.msg) {
        case 'Invalid Email Format':
          errorResponse.push({ field: 'email', message: error.msg });
          break;
        case 'Invalid OTP Format':
          errorResponse.push({ field: 'otp', message: error.msg });
          break;
        default:
          errorResponse.push({ field: 'unknown', message: 'Unknown validation error' });
      }
    });
    return res.status(400).json({ error: errorResponse });
  }

  const { email, otp } = req.body;
  Otp.findOne({ email })
    .then((otpDocument) => {
      if (otpDocument && !otpDocument.used && otpDocument.date >= new Date(Date.now() - 5 * 60 * 1000) && otpDocument.otp === otp) {
        // if (otpDocument && otpDocument.otp === otp) {
        // OTP is valid, mark it as used
        otpDocument.used = true;
        return otpDocument.save();
      } else {
        return Promise.reject('Invalid or expired OTP');
      }
    })
    .then(() => {
      // Send a success response
      res.json({ message: 'OTP Verified Successfully' });
    })
    .catch((error) => {
      if (error === 'Invalid or expired OTP') {
        res.status(400).json({ error: [{ message: error }] });
      } else {
        res.status(500).json({ error: [{ message: 'Error verifying OTP' }] });
      }
    });
}

exports.changePassword = async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorResponse = [];

    errors.array().forEach((error) => {
      switch (error.msg) {
        case 'Invalid email format':
          errorResponse.push({ field: 'email', message: 'Invalid email format' });
          break;
        case 'Password must be at least 8 characters long':
          errorResponse.push({ field: 'password', message: 'Password is too short' });
          break;
        default:
          errorResponse.push({ field: 'unknown', message: 'Unknown validation error' });
          break;
      }
    });

    return res.status(400).json({ error: errorResponse });
  }

  // Check if the new password and confirm password match
  if (password !== confirmPassword) {
    return res.status(400).json({ error: [{ msg: 'Password and Confirm Password do not match' }] });
  }

  const hashpass = await bcryptjs.hashSync(password)
  // Find the user by their email
  await User.findOne({ email })
    .then((user) => {
      if (!user) {
        return Promise.reject('User not found');
      }
      return (hashpass);
    })
    .then((hashedPassword) => {
      // Update the user's password
      return User.findOneAndUpdate({ email }, { password: hashedPassword });
    })
    .then(() => {
      res.json({ message: 'Password changed successfully' });
    })
    .catch((error) => {
      if (error === 'User not found') {
        res.status(404).json({ error: [{ message: 'User not found' }] });
      } else {
        res.status(500).json({ error: [{ message: 'Error changing password' }] });
      }
    });
}

exports.addMenu = async (req, res) => {
  if (!req.body || !req.body.username || !req.body.cartData || !Array.isArray(req.body.cartData)) {
    return res.status(400).json({ error: [{ message: 'Invalid request format' }] });
  }

  const { username, cartData } = req.body;

  try {
    // Check if the user already has a menu
    let existingMenu = await Menu.findOne({ username });

    if (existingMenu) {
      // Iterate over existing cartData
      existingMenu.cartData.forEach((existingItem, index) => {
        // Find an object with similar name in the existing cartData
        const matchingIndex = cartData.findIndex(newItem => newItem.name === existingItem.name);

        if (matchingIndex !== -1) {
          // Remove the existing item with the same name
          existingMenu.cartData.splice(index, 1);
        }
      });

      // Push the new cartData to the existing menu's cartData array
      existingMenu.cartData.push(...cartData);

      // Save the updated menu to the database
      existingMenu.save()
        .then(updatedMenu => {
          res.json(updatedMenu);
        })
        .catch(error => {
          res.status(500).json({ error: [{ message: error.message || 'Error updating menu data' }] });
        });
    } else {
      // Create a new menu with the provided data
      const newMenu = new Menu({
        username,
        cartData
      });

      // Save the menu to the database
      newMenu.save()
        .then(savedMenu => {
          res.json(savedMenu);
        })
        .catch(error => {
          res.status(500).json({ error: [{ message: error.message || 'Error saving menu data' }] });
        });
    }
  } catch (err) {
    res.status(500).json({ error: [{ message: err.message || 'Internal Server Error' }] });
  }
};

exports.removeMenu = async (req, res) => {
  console.log("req.body",req.body);
  if (!req.body || !req.body.username || !req.body.name) {
    return res.status(400).json({ error: [{ message: 'Invalid request format' }] });
  }

  const { username, name } = req.body;

  try {
    // Find the menu for the specified user
    const existingMenu = await Menu.findOne({ username });

    if (existingMenu) {
      // Remove items with the specified name from cartData
      existingMenu.updateOne({ $pull: { cartData: { name } } })
        .then((result) => {
          if (result.modifiedCount > 0) {
            // If any item was removed, return the updated menu
            res.json(existingMenu);
          } else {
            // Else, return no matching item was found
            res.json({ message: 'No item with the specified name found in the cartData' });
          }
        })
        .catch((error) => {
          res.status(500).json({ error: [{ message: error.message || 'Error updating menu data' }] });
        });
    } else {
      res.status(404).json({ error: [{ message: 'Menu not found for the specified user' }] });
    }
  } catch (err) {
    res.status(500).json({ error: [{ message: err.message || 'Internal Server Error' }] });
  }
};

exports.checkout = async (req, res) => {
  const { username } = req.params;
  try {
    const deleteResult = await Menu.deleteOne({ username });
    if (deleteResult.deletedCount > 0) {
      return res.json({ message: 'Checkout successful' });
    } else {
      return res.status(404).json({ error: [{ message: 'Menu not found for the specified user' }] });
    }
  } catch (err) {
    return res.status(500).json({ error: [{ message: err.message || 'Internal Server Error' }] });
  }
};
