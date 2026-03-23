package com.example.Venue_Management.controller;

import com.example.Venue_Management.model.Venue;
import com.example.Venue_Management.service.VenueService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/venues")
public class VenueController {
    private final VenueService venueService;

    public VenueController(VenueService venueService) {
        this.venueService = venueService;
    }

    @GetMapping
    public List<Venue> getAll(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer capacity
    ) {
        if (location == null && capacity == null) {
            return venueService.getAll();
        }
        return venueService.search(location, capacity);
    }

    @GetMapping("/{id}")
    public Venue getById(@PathVariable int id) {
        return venueService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Venue create(@Valid @RequestBody Venue venue) {
        return venueService.create(venue);
    }

    @PutMapping("/{id}")
    public Venue update(@PathVariable int id, @Valid @RequestBody Venue venue) {
        return venueService.update(id, venue);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        venueService.delete(id);
    }
}
