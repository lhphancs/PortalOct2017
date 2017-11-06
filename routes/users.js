var express = require('express');
var multer  = require('multer');
var axios = require('axios');
var upload = multer()
var router = express.Router();

var UserModel = require('../models/user');
var auth = require('../utils/auth');

router.get('/search', function(req, res) {
  var tags = req.query.tags.split(',');
  UserModel.find({
    tags: {
      $in: tags
    }
  }).lean()
    .exec()
    .then(function(users) {
      users.forEach(function(user) {
        // user = user.toObject();
        let count = 0;
        tags.forEach(function(tag) {
          if(user.tags.includes(tag)) {
            count++;
          }
        })

        user.tagsFound = count;
        return user;
      })

      users.sort(function(a, b) {
        if(a.tagsFound < b.tagsFound) return 1;
        if(a.tagsFound > b.tagsFound) return -1;
        return 0;
      })
      
      res.json(users);
    })
    .catch(function(err) {
      res.send(err);
    })
})

router.get('/random', function(req, res) {
  const randomTags = [
    'basketball',
    'hiking',
    'soccer',
    'cooking',
    'muay thai',
    'coding',
    'league of legends',
    'live streaming',
    'baking',
    'eating',
    'hanging out with friends',
    'sleeping',
    'rubix cubes'
  ];

  const randomLocations = [
    'Irvine, CA',
    'San Francisco, CA',
    'Los Angeles, CA',
    'New York City, NY',
    'Miami, FL'
  ];

  const randomSchools = [
    'UC Irvine',
    'SF State',
    'UC Davis',
    'San Jose State University'
  ];

  const randomStudies = [
    'Computer Science',
    'Economics',
    'Accounting',
    'Statistics',
    'Biomedical Engineering'
  ];

  const randomGPAs = ['3.44', '3.00', '4.00', '3.64', '3.50', '2.80', '2.30'];

  let randomSchool =
    randomSchools[Math.floor(Math.random() * randomSchools.length)];
  let randomMajor =
    randomStudies[Math.floor(Math.random() * randomStudies.length)];
  let randomMinor =
    randomStudies[Math.floor(Math.random() * randomStudies.length)];
  let randomGPA = randomGPAs[Math.floor(Math.random() * randomGPAs.length)];

  let randomLocation =
    randomLocations[Math.floor(Math.random() * randomLocations.length)];

  axios.get('https://randomuser.me/api/?inc=login,name,email,picture&results=400')
     .then(function(response) {
          response.data.results.forEach(function(userInfo) {
            let tags = [];
            for (let i = 0; i < Math.floor(Math.random() * randomTags.length); ++i) {
              let random = randomTags[Math.floor(Math.random() * randomTags.length)];
              if (tags.indexOf(random) == -1) {
                tags.push(random);
              }
            }
            let newUser = new UserModel({
              name: `${userInfo.name.first} ${userInfo.name.last}`,
              email: userInfo.email,
              password: userInfo.login.password,
              description: `Hey guys, my name's ${userInfo.name.first} ${userInfo
                .name.last}`,
              // school: randomSchool,
              // major: randomMajor,
              // minor: randomMinor,
              // gpa: randomGPA,
              tags: tags,
              // location: randomLocation,
              photo: userInfo.picture.large
            });
  
            newUser.save(function(err, user) {
              if (err) {
                console.error(err);
              }
  
              // res.json(user);
            });
          })
      }
    )
    .catch(function(error) {
      console.error(error);
      res.send(error);
    });
});

router.get('/near', function(req, res) {
  var lat = parseFloat(req.query.lat);
  var lng = parseFloat(req.query.lng);
  UserModel.where('location.geo')
    .near({
      center: {
        coordinates: [lng, lat],
        type: 'Point'
      },
      maxDistance: 10000
    })
    .then(function(docs) {
      console.log(docs);
      res.json(docs);
    })
    .catch(function(err) {
      console.error(err);
      res.send(err);
    })
})

router.post('/', function(req, res) {
  var body = req.body;
  var hashedPassword = UserModel.hashPassword(body.password);
  body.password = hashedPassword;
  UserModel.create(body)
    .then(function(newUser) {
      res.status(201).json(newUser);
    })
    .catch(function(err) {
      res.status(500).send(err);
    });
});

router.post('/login', function(req, res) {
  var body = req.body;
  UserModel.findOne({ email: body.email })
    .then(function(user) {
      if (!user) return res.render('index', { error: `User doesn't exist` });

      if(user.checkPassword(body.password)) {
        req.session.user = user;
        return res.redirect('/user');
      } else {
        return res.render('index', { error: 'Invalid password' });
      }
    })
    .catch(function(err) {
      return res.render('index', { error: err.toString() });
    })
});

router.post('/register', function(req, res) {
  var body = req.body;
  var hashedPassword = UserModel.hashPassword(body.password);
  body.password = hashedPassword;
  UserModel.create(body)
    .then(function(newUser) {
      req.session.user = newUser;
      return res.redirect('/user');
    })
    .catch(function(err) {
      return res.render('index', { error: err.toString() });
    });
});

router.use(auth.requireLogin);

router.patch('/', upload.array(), function(req, res) {
  var body = req.body;
  body.location = {
    name: body.location,
    geo: {
      type: 'Point',
      coordinates: [parseFloat(body.lng), parseFloat(body.lat)],
    }
  }
  UserModel.findByIdAndUpdate(req.user._id, body, { new: true })
    .then(function(updatedUser) {
      return res.status(200).json(updatedUser);
    })
    .catch(function(err) {
      console.error(err);
      return res.status(500).send(err);
    });
});

router.get('/', function(req, res, next) {
  res.render('profile', { user: req.user });
});

router.get('/logout', function(req, res) {
  req.session.reset();
  res.redirect('/');
})

module.exports = router;
