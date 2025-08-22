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
import Header from './components/Header';
import MyFollowees from './pages/MyFollowees'
import MyFollowers from './pages/MyFollowers'
import {Routes, Route, Navigate} from 'react-router-dom';
import NewPostSuccessful from './pages/NewPostSuccessful';



function App() {
  return(
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/userfeed" element={<UserFeed/>}/>
        <Route path="/newpost" element={<NewPost/>}/>
        <Route path="/new_post_successful" element={<NewPostSuccessful/>}/>
        <Route path="/my_followees" element={<MyFollowees/>}/>
        <Route path="/my_followers" element={<MyFollowers/>}/>
        <Route path ="*" element={<Navigate to="/" replace/>}/>
      </Routes>
  )
}

export default App;