package com.example.Venue_Management.service;

import com.example.Venue_Management.exception.ResourceNotFoundException;
import com.example.Venue_Management.model.Vendor;
import com.example.Venue_Management.repository.VendorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class VendorService {
    private final VendorRepository vendorRepository;

    public VendorService(VendorRepository vendorRepository) {
        this.vendorRepository = vendorRepository;
    }

    public List<Vendor> getAll() {
        return vendorRepository.findAll();
    }

    public Vendor getById(int id) {
        return vendorRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vendor not found: " + id));
    }

    public Vendor create(Vendor vendor) {
        vendor.setVendorId(null);
        return vendorRepository.save(vendor);
    }

    public Vendor update(int id, Vendor vendor) {
        Vendor existing = getById(id);
        existing.setName(vendor.getName());
        existing.setServiceType(vendor.getServiceType());
        existing.setPhone(vendor.getPhone());
        return vendorRepository.save(existing);
    }

    public void delete(int id) {
        if (!vendorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Vendor not found: " + id);
        }
        vendorRepository.deleteById(id);
    }
}

