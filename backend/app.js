const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const babelParser = require("@babel/parser");
const madge = require('madge');
var mongo = require('mongodb');
const pruneAst = require('./functions/pruneAst.js');
const buildPaths = require('./functions/buildPaths.js');
const compareTwoArrays = require('./functions/compareTwoArrays');
const path = require('path');
const { disposeEmitNodes } = require('typescript');
const { getSystemErrorMap } = require('util');

// var dependencyTree = require('dependency-tree');
var url = "mongodb+srv://rand-user:mongo123@atlascluster.t1fpuxe.mongodb.net/?retryWrites=true&w=majority";
var MongoClient = require('mongodb').MongoClient;
var objId;

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    console.log("Database created!");
    // var dbo = db.db("mydb");
    // dbo.createCollection("jsFiles", function(err, res) { // in order to create collection i have to give user the
    //   // readWriteAnyDatabase  permission 
    //   if (err) throw err;
    //   console.log("Collection created!");
    db.close();
    // });
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploadedFiles/')
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  },
});

const upload = multer({ storage: storage });
let ast = 0;
app.use(cors());
var dependencies;
var paths = [];
let jsonObj = {};
let rootName;
var changedFiles = [];
var changedName = [];
var change = {};
var pathsToTest = [];
var finalPathsArray = [];
var deletedFiles = [];
var newFiles = [];
var upDependencies;
// fisrt Phase Extract the dependencies 
app.post('/uploaded_files', upload.single('file'), (req, res) => {
  const filePath = req.file.path; // --> this is the path of the file
  console.log(filePath);
  rootName = req.file.filename;

  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    // build dependeny graph using Madge API
    madge(filePath).then((resp) =>
      resp.image('./image.svg')
    ).then((writtenImagePath) => {
      const data = fs.readFileSync(writtenImagePath);
      jsonObj = { 'imgContent': 'data:image/svg+xml;base64,' + Buffer.from(data.toString()).toString('base64') };
      console.log('Image written to ' + writtenImagePath);
    });

    madge(filePath, { "excludeRegExp": ["^.*assets.*$"] }).then((respo) => {
      //TODO: Check if circular dependency exist .... stop running
      if (respo.circular().length > 0) {
        res.json({ 'circular': true, 'treeElements': [], 'imgContent': "" });
      }

      dependencies = respo.obj(); // the dependencies as an object
      buildPaths(rootName, dependencies, [], paths);

      // MongoClient.connect(url, function(err, db) {
      //   if (err) throw err;
      //   var dbo = db.db("mydb");
      //   var myobj = { name: filePath, file_dependencies: dependencies };
      //   dbo.collection("jsFiles").insertOne(myobj, function(err, res) {
      //     if (err) throw err;
      //     objId = myobj._id;
      //     console.log("1 file inserted " + objId);
      //     db.close();
      //   });
      // });
    });

    // madge('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\updatedFiles\\'+rootName, {"excludeRegExp": ["^.*assets.*$"]}).then((respod) => {
    //   upDependencies = respod.obj(); // the dependencies as an object
    //   console.log(upDependencies);throw new Error;
    // });  
  });  //read file

  setTimeout(function () {
    // loop through different files in the dependencies
    Object.keys(dependencies).forEach((file) => {
      var placement = [];
      var deletion = [];
      var update = [];

      if (fs.existsSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\uploadedFiles\\' + file)
        && !fs.existsSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\updatedFiles\\' + file)) {
        deletedFiles.push(file);
        return;
      } else if (fs.existsSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\updatedFiles\\' + file)
        && !fs.existsSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\uploadedFiles\\' + file)) {
        newFiles.push(file);
        return;
      }

      var fileSrc = fs.readFileSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\uploadedFiles\\' + file);
      console.log(file);
      // The readFileSync() function returns a Buffer.
      //we can use the toString() method on the Buffer object to get the contents as String.
      // 4- parse the file content using the babel parser
      ast = babelParser.parse(fileSrc.toString(), {
        sourceType: "module",
        plugins: [
          // enable jsx and js syntax
          "jsx",
          "js",
        ],
      });

      let JSXComponents = [];
      pruneAst(ast, JSXComponents); // this function to detect the jsx components and push them into the JSXCompnents array
      JSXComponents = JSXComponents.filter(function (element) { // remove undefined elements from array 
        return element !== undefined;
      });

      var updatedSrc = fs.readFileSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\updatedFiles\\' + file);
      astUpdated = babelParser.parse(updatedSrc.toString(), {
        sourceType: "module",
        plugins: [
          // enable jsx and js syntax
          "jsx",
          "js",
        ],
      });

      // traverse the AST and detect the jsx component using the pruneAst Function
      let JSXComponents_updated = [];
      pruneAst(astUpdated, JSXComponents_updated); // this function to detect the jsx components and push them into the JSXCompnents array
      JSXComponents_updated = JSXComponents_updated.filter(function (element) { // remove undefined elements from array 
        return element !== undefined;
      });
      compareTwoArrays(JSXComponents[0], JSXComponents_updated[0], update, placement, deletion);
      // console.log('update '+ update, ' deleteion ' + deletion, ' placement '+ placement);
      if (deletion.length !== 0 || placement.length !== 0 || update.length !== 0) {
        change = {
          fileName: file,
          updates: update,
          placements: placement,
          deletions: deletion
        };
        changedFiles.push(change);
        changedName.push(file);
      }
    }); // FOREACH dependencies

    paths.forEach(path => {
      path.some(function (r) {
        if (changedName.includes(r)) {
          pathsToTest.push(path.slice(0, (path.indexOf(r) + 1)));
        }
      });
    });

    var uniquePaths = Array.from(new Set(pathsToTest.map(JSON.stringify)), JSON.parse); // to remove redundant paths
    if (deletedFiles.length > 0) {
      var treeNode = {};
      deletedFiles.forEach(function (del, index) {
        treeNode['key'] = index;
        treeNode['name'] = del;
        treeNode['color'] = 'black'; // default path color
      });

      finalPathsArray.push({
        'key': 'Deleted Files',
        'nodes': [treeNode]
      });
    }

    if (newFiles.length > 0) {
      var treeNode = {};
      newFiles.forEach(function (nFile, index) {
        treeNode['key'] = index;
        treeNode['name'] = nFile;
        treeNode['color'] = 'black'; // default path color
      });
      
      finalPathsArray.push({
        'key': 'New Files',
        'nodes': [treeNode]
      });
    }

    if (uniquePaths.length == 0) {
      finalPathsArray.push({
        'key': 'The files are identical',
        'nodes': []
      });
    } else {
      var index = 0;
      uniquePaths.forEach(function (path, key) {
        var treeData = [];
        finalPathsArray.push({
          'key': 'Path' + (key + 1),
          'nodes': treeData
        });
        for (let i = 0; i < path.length; i++) {
          file = path[i];
          var treeNode = {};
          treeNode['key'] = index;
          treeNode['name'] = file;
          treeNode['color'] = 'black'; // default path color
          var objectFromArray = changedFiles.find(o => o.fileName === file);
          updatesChildren = [];
          deletionChildren = [];
          placementsChildren = [];

          var children = [];
          var updates = {};
          var deletions = {};
          var placements = {};

          if (objectFromArray) {
            treeNode['color'] = 'red'; // to color the name of the changed file
            for (const key in objectFromArray.updates) {
              var object = {};
              object['key'] = 'up' + key;
              object['name'] = objectFromArray.updates[key]['name'];
              object['attributes'] = objectFromArray.updates[key]['attributes'];
              object['color'] = 'black'; // default path color
              object['children'] = [];
              updatesChildren.push(object);
            }

            for (const key in objectFromArray.deletions) {
              var object = {};
              object['key'] = 'dl' + key;
              object['name'] = objectFromArray.deletions[key]['name'];
              object['attributes'] = objectFromArray.deletions[key]['attributes'];
              object['color'] = 'black'; // default path color
              object['children'] = objectFromArray.deletions[key]['children'];
              deletionChildren.push(object);
            }

            for (const key in objectFromArray.placements) {
              console.log(objectFromArray.placements[0].children);
              var object = {};
              object['key'] = 'pl' + key;
              object['name'] = objectFromArray.placements[key]['name'];
              object['attributes'] = objectFromArray.placements[key]['attributes'];
              object['color'] = 'black'; // default path color
              object['children'] = objectFromArray.placements[key]['children'];
              placementsChildren.push(object);
            }

            if(updatesChildren.length > 0) {
              updates['key'] = index + "-" + index;
              updates['name'] = "Updates";
              updates['children'] = updatesChildren;
            }

            if(deletionChildren.length > 0) {
              deletions['key'] = index + "-" + (index + 1);
              deletions['name'] = "Deletions";
              deletions['children'] = deletionChildren;
            }
            if(placementsChildren.length > 0) {
              placements['key'] = index + "-" + (index + 2);
              placements['name'] = "Placements";
              placements['children'] = placementsChildren;
            }
          }

          children.push(updates, deletions, placements);
          treeNode['children'] = children;
          treeData.push(treeNode);
        } // for path
      }); // foreach pathsToTest
    }
  }, 2000);

  setTimeout(() => {
    // Object.assign to append to the object
    console.log(finalPathsArray[0]);

    jsonObj = Object.assign(jsonObj, { 'treeElements': finalPathsArray });
    res.json(jsonObj);
  }, 4000);
});