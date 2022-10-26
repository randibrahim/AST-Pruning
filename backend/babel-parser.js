const babelParser = require("@babel/parser");

const code = `
const Foo = (
 <div>{greeting}</div>
);

const greeting = "Hello, World!";

export const Bar = Foo;

export const Baz = () => 123;
`;
const ast = babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"]
});

const detectedComponents = [];
for (const statement of ast.program.body) {
  if (statement.type === "VariableDeclaration") {
    const componentName = getDeclaredComponentName(statement);
    if (componentName) {
      detectedComponents.push(componentName);
    }
  } else if (statement.type === "ExportNamedDeclaration") {
    const componentName = getDeclaredComponentName(statement.declaration);
    if (componentName) {
      detectedComponents.push(componentName);
    }
  }
}

function getDeclaredComponentName(declaration) {
  for (const declarator of declaration.declarations) {
    if (declarator.id.type === "Identifier" &&
        declarator.init &&
        declarator.init.type === "ArrowFunctionExpression") {
      if (containsJsxElement(declarator.init.body)) {
        return declarator.id.name;
      }
    }
  }
  return null;
}

function containsJsxElement(node) {
  if (node.type === "JSXElement") {
    return true;
  }
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item.constructor.name !== "Node") {
          continue;
        }
        if (containsJsxElement(child)) {
          return true;
        }
      }
    } else if (child.constructor.name !== "Node") {
      continue;
    }
    if (containsJsxElement(child)) {
      return true;
    }
  }
  return false;
}

console.log(detectedComponents);