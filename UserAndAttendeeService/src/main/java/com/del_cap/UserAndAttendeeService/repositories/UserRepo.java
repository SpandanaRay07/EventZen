package com.del_cap.UserAndAttendeeService.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.del_cap.UserAndAttendeeService.models.User;

public interface UserRepo extends JpaRepository<User, Long> {
    public Optional<User> findByEmailAndPassword(String email,String password); //custom method
}
