package com.example.Venue_Management.repository;

import com.example.Venue_Management.model.Venue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VenueRepository extends JpaRepository<Venue, Integer> {
    @Query("""
            select v
            from Venue v
            where (:location is null or lower(v.location) like lower(concat('%', :location, '%')))
              and (:capacity is null or v.capacity >= :capacity)
            """)
    List<Venue> search(@Param("location") String location, @Param("capacity") Integer capacity);
}

