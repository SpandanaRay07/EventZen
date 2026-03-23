package com.del_cap.UserAndAttendeeService.services;

import com.del_cap.UserAndAttendeeService.repositories.UserRepo;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.del_cap.UserAndAttendeeService.models.User;

@Service
public class UserService {
    @Autowired
    private UserRepo userRepo;

    public User RegisterUser(User user){
        return userRepo.save(user);
    }

    public User LoginUser(String email,String password){
        Optional<User> user=userRepo.findByEmailAndPassword(email, password);
        if(user.isPresent()){
            return user.get();
        }else{
            return null; //throw exception
        }
    }
}
