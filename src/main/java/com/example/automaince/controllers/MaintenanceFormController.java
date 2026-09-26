package com.example.automaince.controllers;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

public class MaintenanceFormController {
    @FXML private ComboBox<String> vehicle, type;
    @FXML private DatePicker date, nextMaintenance;
    @FXML private TextField mileage, cost;
    @FXML private TextArea description;
    @FXML private void initialize() { FormValues.loadVehicles(vehicle); type.getItems().addAll("Preventivo", "Correctivo"); type.getSelectionModel().selectFirst(); date.setValue(LocalDate.now()); }
    Map<String,Object> data() {
        Map<String,Object> value = new LinkedHashMap<>(); value.put("vehicleId", FormValues.vehicleId(vehicle.getValue())); value.put("type", type.getValue());
        value.put("date", FormValues.date(date)); value.put("mileage", Integer.parseInt(mileage.getText().trim())); value.put("cost", Double.parseDouble(cost.getText().trim()));
        value.put("nextMaintenance", FormValues.date(nextMaintenance)); value.put("description", description.getText()); return value;
    }
}
