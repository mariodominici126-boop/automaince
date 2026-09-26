package com.example.automaince.controllers;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

public class FuelFormController {
    @FXML private ComboBox<String> vehicle;
    @FXML private DatePicker date;
    @FXML private TextField mileage, liters, cost, provider;
    @FXML private void initialize() { FormValues.loadVehicles(vehicle); date.setValue(LocalDate.now()); }
    Map<String,Object> data() {
        Map<String,Object> value = new LinkedHashMap<>(); value.put("vehicleId", FormValues.vehicleId(vehicle.getValue())); value.put("date", FormValues.date(date));
        value.put("mileage", Integer.parseInt(mileage.getText().trim())); value.put("liters", Double.parseDouble(liters.getText().trim()));
        value.put("cost", Double.parseDouble(cost.getText().trim())); value.put("provider", provider.getText()); return value;
    }
}
