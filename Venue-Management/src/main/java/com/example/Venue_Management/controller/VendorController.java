package com.example.Venue_Management.controller;

import com.example.Venue_Management.model.Vendor;
import com.example.Venue_Management.service.VendorService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/vendors")
public class VendorController {
    private final VendorService vendorService;

    public VendorController(VendorService vendorService) {
        this.vendorService = vendorService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Vendor create(@Valid @RequestBody Vendor vendor) {
        return vendorService.create(vendor);
    }

    @GetMapping
    public List<Vendor> getAll() {
        return vendorService.getAll();
    }

    @GetMapping("/{id}")
    public Vendor getById(@PathVariable int id) {
        return vendorService.getById(id);
    }

    @PutMapping("/{id}")
    public Vendor update(@PathVariable int id, @Valid @RequestBody Vendor vendor) {
        return vendorService.update(id, vendor);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable int id) {
        vendorService.delete(id);
    }
}

