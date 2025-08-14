// To start this up:
// ...\server> python -m flask --app app run --reload --port 5000
//...\client\soundalore-gen1> npm start
//
//

//import React, import CSS, import logos, 
import React, {useState, useEffect, useRef} from 'react';
import logo from './logo.svg';
import './App.css';
import Login from './pages/Login';
import UserFeed from './pages/UserFeed';
import NewPost from './pages/NewPost';
import AudioPlayer from './components/AudioPlayer';
import Header from './components/Header.jsx';
import {Routes, Route, Navigate} from 'react-router-dom';


function App() {
  return(
      <Routes>
        <Route path="/" element={<Login />}/>
        <Route path="/userfeed" element={<UserFeed/>}/>
        <Route path="newpost" element={<NewPost/>}/>
        <Route path ="*" element={<Navigate to="/" replace/>}/>
      </Routes>
  )
}

export default App;
