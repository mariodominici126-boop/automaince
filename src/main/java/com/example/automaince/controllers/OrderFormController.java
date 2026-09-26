package com.example.automaince.controllers;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import java.util.LinkedHashMap;
import java.util.Map;

public class OrderFormController {
    @FXML private ComboBox<String> vehicle, type, priority;
    @FXML private TextField provider;
    @FXML private TextArea description;
    @FXML private void initialize() { FormValues.loadVehicles(vehicle); type.getItems().addAll("Preventivo", "Correctivo"); type.getSelectionModel().selectFirst(); priority.getItems().addAll("Media", "Alta", "Crítica"); priority.getSelectionModel().selectFirst(); }
    Map<String,Object> data() {
        Map<String,Object> value = new LinkedHashMap<>(); value.put("vehicleId", FormValues.vehicleId(vehicle.getValue())); value.put("type", type.getValue());
        value.put("priority", priority.getValue()); value.put("provider", provider.getText()); value.put("description", description.getText()); return value;
    }
}
