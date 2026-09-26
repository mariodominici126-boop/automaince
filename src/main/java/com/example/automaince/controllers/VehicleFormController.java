package com.example.automaince.controllers;

import javafx.fxml.FXML;
import javafx.scene.control.*;
import java.util.LinkedHashMap;
import java.util.Map;

public class VehicleFormController {
    @FXML private TextField plate, brand, model, year, driver;
    @FXML private ComboBox<String> type;
    @FXML private DatePicker nextMaintenance;
    @FXML private void initialize() { type.getItems().addAll("Pickup", "Van", "Camión"); type.getSelectionModel().selectFirst(); }
    Map<String,Object> data() {
        Map<String,Object> value = new LinkedHashMap<>(); value.put("plate", plate.getText()); value.put("brand", brand.getText());
        value.put("model", model.getText()); value.put("year", Integer.parseInt(year.getText().trim())); value.put("type", type.getValue());
        value.put("driver", driver.getText()); value.put("nextMaintenance", FormValues.date(nextMaintenance)); return value;
    }
}
