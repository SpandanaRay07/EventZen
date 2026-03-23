package com.del_cap.UserAndAttendeeService.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.del_cap.UserAndAttendeeService.models.User;
import com.del_cap.UserAndAttendeeService.services.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    @Autowired
    private UserService userService;

    // Register User
    @PostMapping("/register")
public ResponseEntity<?> registerUser(@RequestBody User user) {

    System.out.println("User received: " + user.getEmail());

    User u = userService.RegisterUser(user);

    return ResponseEntity.status(HttpStatus.CREATED).body(u);
}
    // Login User
    @PostMapping("/login")
public ResponseEntity<?> loginUser(@RequestBody User user) {

    User u = userService.LoginUser(user.getEmail(), user.getPassword());

    if (u != null) {

        u.setPassword(null);
        u.setConfirmPass(null);

        return ResponseEntity.ok(u);
    } 
    else {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body("Invalid credentials");
    }
}
}