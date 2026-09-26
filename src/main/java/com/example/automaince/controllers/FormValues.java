package com.example.automaince.controllers;

import com.example.automaince.services.ApiClient;
import javafx.scene.control.ComboBox;

final class FormValues {
    private FormValues() {}
    static void loadVehicles(ComboBox<String> combo) {
        try {
            for (var vehicle : ApiClient.list("vehicles")) combo.getItems().add(vehicle.get("id") + " · " + vehicle.get("plate"));
            combo.getSelectionModel().selectFirst();
        } catch (Exception e) { throw new IllegalStateException("No se pudieron cargar los vehículos: " + e.getMessage(), e); }
    }
    static String vehicleId(String selected) { return selected == null ? "" : selected.split(" · ")[0]; }
    static String date(javafx.scene.control.DatePicker picker) { return picker.getValue() == null ? "" : picker.getValue().toString(); }
}
