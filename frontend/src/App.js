import * as React from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import './App.css';
import { useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Tree from 'react-d3-tree';
import './custom-tree.css';

// import image  from './images/image.svg'
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={'simple-tabpanel-${index}'}
      aria-labelledby={'simple-tab-${index}'}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function TreeCust ({ treeData }) {
  return (
    <ul>
      {treeData.map((node) => (
        <TreeNode node={node} key={node.key}/>
      ))}
    </ul>
  );
}

function TreeNode({ node }) {
  const { children, name } = node;
  const [showChildren, setShowChildren] = useState(false);
  const handleClick = () => {
    setShowChildren(!showChildren);
  };
  return (
    <>
      <div onClick={handleClick} style={{ marginBottom: "10px" }}>
        <span style={{color: node.color}}>{name}</span>
      </div>
      <ul style={{ paddingLeft: "10px", borderLeft: "1px solid black" }}>
        {showChildren && children && 
        <>
          <ul>Updates 
          {typeof children.find(o => o.name === 'Updates') !== 'undefined'  ?
              <div style={{ width: "100%", height: "100vh" }}>
                <Tree
                data={children.find(o => o.name === 'Updates')}
                rootNodeClassName="node__root"
                branchNodeClassName="node__branch"
                leafNodeClassName="node__leaf" 
                pathFunc="step"
                orientation="vertical"
                zoomable={false}
                translate={{ x: 500, y: 100 }}
                />
              </div>
            :<div></div>}
          </ul>
          <ul>Deletions
          {typeof children.find(o => o.name === 'Deletions') !=='undefined' ?
            <div style={{ width: "100%", height: "100vh" }}>
              <Tree data={children.find(o => o.name === 'Deletions')}
              rootNodeClassName="node__root"
              branchNodeClassName="node__branch"
              leafNodeClassName="node__leaf"
              pathFunc="step"
              orientation="vertical"
              zoomable={false}
              translate={{ x: 500, y: 100 }}
              />
            </div> :<div></div>}
          </ul>
          <ul>Placements
            {typeof children.find(o => o.name === 'Placements') !=='undefined' ? 
            <div style={{ width: "100%", height: "80vh" }}>
              <Tree  data={children.find(o => o.name === 'Placements')} 
              rootNodeClassName="node__root"
              branchNodeClassName="node__branch"
              leafNodeClassName="node__leaf"  
              pathFunc="step"
              orientation="vertical"
              zoomable={false}
              translate={{ x: 500, y: 100 }}
            />
            </div>
            : <div></div>}
          </ul>
        </>}
      </ul>
    </>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};



function a11yProps(index) {
  return {
    id: 'simple-tab-${index}',
    'aria-controls': 'simple-tabpanel-${index}',
  };
}

export default function BasicTabs() {
  const [value, setValue] = React.useState(0);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  const [nextStep,setNextStep] = useState(false);
  const [image,setImage]= useState("");
  const [treeElements,setTreeElement]= useState([]);
  const [notify, setNotify] = useState('');

  const handleSubmit = async (e) => {
      e.preventDefault();
      const file = document.getElementById('file');
      let formData = new FormData
      formData.append('file', file.files[0])
      // formData.append('updatedFile', updatedFile.files[0])
      const response = await fetch('http://localhost:5000/uploaded_files', {
        method: 'POST',
        body: formData
      });
      if (response) {
        setNextStep(response.status);
        const result = await response.json();
        setImage(result.imgContent);
        console.log(result.treeElements);
        setTreeElement(result.treeElements);
        if(result.circular) { // if we have circular dependencies
          setNotify(toast('Sorry! You have circular dependecies in your code :('));
        }
    };
  }
  
  return (
    <div>
      <p onClick={notify}></p>
      <ToastContainer style={{ position:'absolute',
                              left:'50%',
                              top:'50%',
                              transform:'translate(-50%, -50%)'}} />

      <h1 className='App' id='mainHeader'>GUI Model Pruning</h1>   
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
            <Tab label="Extract Application Dependencies and Paths to Test" {...a11yProps(0)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <div className='App'>
            <form onSubmit={handleSubmit}>
              <label>Application Index File:  </label>
              <input required type='file' id='file' name='file'></input>
              <button type='submit'>Submit</button>
            </form>
          </div>
          <img  src={image} style={{ margin: 'auto', width: '80%', display: 'block' }} id="dependencyImg" />
          {
            treeElements.map((element, key) => (
              <div>
                <p style={{color: 'green'}}><b>{element.key}</b></p>
                <TreeCust treeData={element.nodes} /> 
              </div>  
            ))
          }
        </TabPanel>
      </Box>
    </div>
  );
}
// import React from 'react';
// import Tree from 'react-d3-tree';

// // This is a simplified example of an org chart with a depth of 2.
// // Note how deeper levels are defined recursively via the `children` property.
// const orgChart = {
//   name: 'CEO',
//   children: [
//     {
//       name: 'Manager',
//       attributes: {
//         department: 'Production',
//       },
//       children: [
//         {
//           name: 'Foreman',
//           attributes: {
//             department: 'Fabrication',
//           },
//           children: [
//             {
//               name: 'Worker',
//             },
//           ],
//         },
//         {
//           name: 'Foreman',
//           attributes: {
//             department: 'Assembly',
//           },
//           children: [
//             {
//               name: 'Worker',
//             },
//           ],
//         },
//       ],
//     },
//   ],
// };

// export default function OrgChartTree() {
//   return (
//     // `<Tree />` will fill width/height of its container; in this case `#treeWrapper`.
//     <div id="treeWrapper" style={{ width: '50em', height: '50em' }}>
//       <Tree data={orgChart}
      //  rootNodeClassName="node__root"
      //  branchNodeClassName="node__branch"
      //  leafNodeClassName="node__leaf" />
//     </div>
//   );
// }
