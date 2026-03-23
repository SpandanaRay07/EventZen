package com.example.Venue_Management.service;

import com.example.Venue_Management.exception.ResourceNotFoundException;
import com.example.Venue_Management.model.Venue;
import com.example.Venue_Management.repository.VenueRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VenueService {
    private final VenueRepository venueRepository;

    public VenueService(VenueRepository venueRepository) {
        this.venueRepository = venueRepository;
    }

    public List<Venue> getAll() {
        return venueRepository.findAll();
    }

    /**
     * Filter venues by optional location (partial match) and minimum capacity.
     */
    public List<Venue> search(String location, Integer capacity) {
        return venueRepository.search(emptyToNull(location), capacity);
    }

    public Venue getById(int id) {
        return venueRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venue not found: " + id));
    }

    public Venue create(Venue venue) {
        venue.setVenueId(null);
        return venueRepository.save(venue);
    }

    public Venue update(int id, Venue venue) {
        Venue existing = getById(id);
        existing.setName(venue.getName());
        existing.setLocation(venue.getLocation());
        existing.setCapacity(venue.getCapacity());
        return venueRepository.save(existing);
    }

    public void delete(int id) {
        if (!venueRepository.existsById(id)) {
            throw new ResourceNotFoundException("Venue not found: " + id);
        }
        venueRepository.deleteById(id);
    }

    private static String emptyToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
