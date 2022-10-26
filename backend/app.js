const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const babelParser = require("@babel/parser");
const _traverse = require('@babel/traverse');
const madge = require('madge');
var mongo = require('mongodb');
const lodash = require('lodash');

// var dependencyTree = require('dependency-tree');
var url = "mongodb+srv://rand-user:mongo123@atlascluster.t1fpuxe.mongodb.net/?retryWrites=true&w=majority";
var MongoClient = require('mongodb').MongoClient;
const { errorMonitor } = require('events');
var objId;

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
  MongoClient.connect(url, function(err, db) {
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
var imageContent;

// fisrt Phase Extract the dependencies 
app.post('/uploaded_files', upload.single('file'), (req, res) => {
  const filePath = req.file.path; // --> this is the path of the file
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
        jsonObj = {'imgContent' :'data:image/svg+xml;base64,' + Buffer.from(data.toString()).toString('base64')};
        console.log('Image written to ' + writtenImagePath);
    });    

    madge(filePath).then((respo) => {
      //TODO: Check if circular dependency exist .... stop running
      // if(respo.circular().length > 0) {
      //   res.json({'circular': true, 'treeElements' : [], 'imgContent': ""});
      // }

      dependencies = respo.obj(); // the dependencies as an object
      buildPaths(rootName, dependencies);

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        var myobj = { name: filePath, file_dependencies: dependencies };
        dbo.collection("jsFiles").insertOne(myobj, function(err, res) {
          if (err) throw err;
          objId = myobj._id;
          console.log("1 file inserted " + objId);
          db.close();
        });
      });
    });  
  });  //read file

  setTimeout(function() { 
    // loop through different files in the dependencies
    Object.keys(dependencies).forEach((file, index) => {
      var placement = [];
      var deletion = [];
      var update = [];

      var fileSrc = fs.readFileSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\uploadedFiles\\'+file);
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
      JSXComponents = JSXComponents.filter(function( element ) { // remove undefined elements from array 
        return element !== undefined;
      });

      var updatedSrc = fs.readFileSync('C:\\Users\\Tec\\React Native Applications\\Upload-main\\backend\\updated-src\\'+file);
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
      JSXComponents_updated = JSXComponents_updated.filter(function( element ) { // remove undefined elements from array 
        return element !== undefined;
      });

      compareTwoArrays(JSXComponents[0], JSXComponents_updated[0], update, placement, deletion);
      console.log('update '+ update, ' deleteion ' + deletion, ' placement '+ placement);
      if(deletion.length !== 0 || placement.length !== 0 || update.length !== 0) {
        change = {
          fileName : file,
          updates: update, 
          placements: placement,
          deletions: deletion
        };
        changedFiles.push(change);
        changedName.push(file);
      }
    }); // FOREACH dependencies

    paths.forEach(path => {
      const found = path.some(r=> changedName.includes(r));
      if(found) {
        pathsToTest.push(path);
      }
    });

    if(pathsToTest.length == 0) {
      finalPathsArray.push({
        'key' : 'The files are identical',
        'nodes' : []
      });
    } else {
      var index = 0;
      pathsToTest.forEach(function (path, key){
        var treeData = [];
        finalPathsArray.push({
          'key' : 'Path'+key+1,
          'nodes' : treeData
        });
        path.forEach(file => {
          var treeNode = {};
          treeNode['key'] = index;
          treeNode['label'] = file;
          treeNode['color'] = 'black'; // default path color
          var objectFromArray = changedFiles.find(o => o.fileName === file);
          updatesChildren = [];
          deletionChildren = [];
          placementsChildren = [];

          if(objectFromArray) {
            treeNode['color'] = 'red'; // to color the name of the changed file
            for (const key in objectFromArray.updates) {
              var object = {};
              object['key'] = 'up'+key;
              object['label'] = "<" + objectFromArray.updates[key]['name'] + " "+  objectFromArray.updates[key]['props']  + ">" +  JSON.stringify(objectFromArray.updates[key]['children'], null, 2) ;
              object['color'] = 'black'; // default path color
              updatesChildren.push(object);
            }

          ;
            for (const key in objectFromArray.deletions) {
              var object = {};
              object['key'] = 'dl'+key;
              object['label'] = "<" + objectFromArray.deletions[key]['name'] + " "+  objectFromArray.deletions[key]['props']  + ">" +  JSON.stringify(objectFromArray.deletions[key]['children'], null, 2)  ;
              deletionChildren.push(object);
            }

            
            for (const key in objectFromArray.placements) {
              var object = {};
              object['key'] = 'pl'+key;
              object['label'] = "<" + objectFromArray.placements[key]['name'] + " "+  objectFromArray.placements[key]['props']  + ">" +  JSON.stringify(objectFromArray.placements[key]['children'], null, 2) ;
              placementsChildren.push(object);
            }
          } // if objectFromArray

          var children = [];
          var updates = {};
          updates['key'] = index + "-" + index;
          updates['label'] = "Updates";
          updates['children'] = updatesChildren;

          var deletions = {};
          deletions['key'] = index + "-" + (index + 1);
          deletions['label'] = "Deletions";
          deletions['children'] = deletionChildren;

          var placements = {};
          placements['key'] = index + "-" + (index + 2);
          placements['label'] = "Placements";
          placements['children'] = placementsChildren;

          children.push(updates, deletions, placements);
          treeNode['children'] = children;
          treeData.push(treeNode);
          index ++;
        }); // foreach path
        
      }); // foreach pathsToTest
    }
  }, 2500);

  setTimeout(() => {
    console.log(finalPathsArray);
    // Object.assign to append to the object
    jsonObj = Object.assign(jsonObj, {'treeElements' : finalPathsArray});
    res.json(jsonObj);
   }, 3000);  
});

var visitedNodes = [];
function pruneAst(ast, JSXComps) {
  // we use the bable traverser to traverse the AST
  var firstNode;
  _traverse.default(ast, {
    ExportDefaultDeclaration(path) { // to access only the ExportDefaultDeclaration nodes
      var pathType = path.node.declaration.type;
      if(pathType === 'FunctionDeclaration') { // if the function is declared directly after the export like 
        //export default function BasicTabs() {......} 
        firstNode = path.node.declaration.body.body.find(node => node.type === 'ReturnStatement').argument;
      } else if(pathType === 'AssignmentExpression') { // to cover the arrowFunction case
        //export default App = () => {
        firstNode = path.node.declaration.right.body.body.find(node => node.type === 'ReturnStatement').argument;
      }  else if(pathType === 'Identifier') {//export default HelloWorldApp;
          let identifierName = path.node.declaration.name; // HelloWorldApp
          // now we have to traverse the functionDeclaration and variableDeclaration nodes and 
          //check if the name of the function/variable equals the identifierName
          _traverse.default(ast, {
            enter(path) {
              if(path.node.type === 'FunctionDeclaration') {
                if(path.node.id.name !== identifierName) {
                  path.skip;
                } else {
                  firstNode = path.node.body.body.find(node => node.type === 'ReturnStatement').argument;
                  path.stop; // to stop traversing
                }
              } else if(path.node.type === 'VariableDeclaration') {
                // the HelloWorldApp is a variable declaration not function declaration
                for (let declarator of path.node.declarations) {
                  if(declarator.id.name === identifierName) {
                    firstNode = declarator.init.body.body.find(node => node.type === 'ReturnStatement').argument;
                    break;
                  }
                }
                path.stop;
              } else if(path.node.type === 'ClassDeclaration') {
                for(let method of path.body.body) {
                  if(method.type === 'ClassMethod' && method.key.name === 'render') { // find the render method
                    firstNode = method.body.body.find(node => node.type === 'ReturnStatement').argument;
                    break;
                  }
                }
                path.stop; // to stop traversing
              }
          }
        });
      }
    },
  });
  JSXComps.push(detectJSXelements([], firstNode, visitedNodes));
}

function detectJSXelements (previousNodes, currentNode, visitedNodes)  {
  let element = {}; 
  let value = null;
  let elementName;
  var propsAttr = [];

  if(visitedNodes.includes(currentNode)) {
    return; // skip the already visited nodes 
  }
  visitedNodes.push(currentNode);

  if(currentNode) {
    var alphaReg = /[a-zA-Z]/g;
    // alphaReg.exec(currentNode.value) !== null is used to avoid adding JSText for "\n   " value 
    if (currentNode.type === "JSXText" && alphaReg.exec(currentNode.value) != null) { 
      value = currentNode.value;
      elementName = 'JSXText';
    } else if(currentNode.type === "JSXElement") {
      if(currentNode.openingElement.name.type === 'JSXIdentifier') { // like <div>
        elementName = currentNode.openingElement.name.name;
      } else if(currentNode.openingElement.name.type === 'JSXMemberExpression') { // like <React.StrictMode>
        elementName = currentNode.openingElement.name.object.name + '.' + currentNode.openingElement.name.property.name;
      }
      for(attribute of currentNode.openingElement.attributes) {
        if(typeof attribute.name !== 'undefined' && (attribute.value) && attribute.value.type !== 'JSXExpressionContainer') {
          // can't detect the properties wit object value like 
          //screenOptions={{
        // headerStyle: {
        // 	backgroundColor: '#228CDB'
        // },
        //   	headerTintColor: '#fff'
        // }}
          propsAttr[attribute.name.name] = attribute.value.value
        }
      }
    }

    if(typeof elementName !== 'undefined') {
      element = {
        name: elementName,
        props: propsAttr,
        value: value,
        children: [],
      };
      if(typeof previousNodes != 'undefined') {
        previousNodes.push(element);
      }
    }
      
    if ("children" in currentNode) {
      currentNode.children.forEach(node => {
        if(typeof previousNodes != 'undefined') {
          if(previousNodes.length > 0) {
            detectJSXelements(element.children, node, visitedNodes);
          } else {
              detectJSXelements(previousNodes, node, visitedNodes);
          }
        }
      });         
    }
  }
  return previousNodes;
}

// starting from the uploaded file
function buildPaths(start, dependencies, path = []) {
  if (start == null) {
    return; 
  }   
  path.push(start);
  var pathClone = JSON.parse(JSON.stringify(path)); // pushing path to the paths and then modify the path will cause the pushed path to change 
  // so i had to clone the path and push it to the paths.. 
  if(dependencies[start].length == 0) {
    paths.push(pathClone);
    path.pop();
    return;
  }
  for(file of dependencies[start]) {
    buildPaths(file, dependencies, path);
  }
  path.pop();
}

function compareTwoArrays (oldArray, newArray, update, placement, deletion)  {
  if(typeof oldArray !== 'undefined' && typeof newArray !== 'undefined' ) {
    if(oldArray.length == 0 && newArray.length == 0) { // empty arrays / base condition
      return;
    } 
    var length = oldArray.length > newArray.length ? oldArray.length : newArray.length;
    for(var i = 0; i < length; i++) {
      if (typeof oldArray[i] === 'undefined' && newArray[i] instanceof Object) {
        placement.push(newArray[i]);
      }else if (typeof newArray[i] === 'undefined' && oldArray[i] instanceof Object) {
          deletion.push(oldArray[i]);
      } else if (oldArray[i] instanceof Object && newArray[i] instanceof Object) {
          // return compareObjects(oldArray[i], newArray[i]);
          if(oldArray[i]['name'] === newArray[i]['name']) { 
            //if the old object and the new object have the same type,
            // we check the props and value of both objects
            // if not equal then push to update else start comparing the children
            if(!lodash.isEqual(oldArray[i]['props'], newArray[i]['props']) || oldArray[i]['value'] !== newArray[i]['value']) {
              update.push(oldArray[i]);
            } else {
              compareTwoArrays(oldArray[i]['children'], newArray[i]['children'], update, placement, deletion);
            }
          } else if(oldArray[i]['name'] !== newArray[i]['name']) { // change in the type of the element 
            placement.push(newArray[i]);
            deletion.push(oldArray[i]);
          }
      }
    }
  }
  return;
}