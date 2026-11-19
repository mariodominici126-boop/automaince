package com.example.automaince.controllers;

import com.example.automaince.services.ApiClient;

import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DashboardController {
    @FXML private Label active, maintenance, outOfService, cost;
    @FXML private TableView<Map<String,Object>> orders;
    @FXML private ListView<String> alerts;

    @FXML private void initialize() {
        try {
            Map<String,Object> data = ApiClient.object("dashboard");
            active.setText(String.valueOf(data.get("active")));
            maintenance.setText(String.valueOf(data.get("maintenance")));
            outOfService.setText(String.valueOf(data.get("outOfService")));
            Object costs = data.get("costs");
            cost.setText(costs instanceof Map<?,?> map ? "$" + map.get("total") : "—");
            List<Map<String,Object>> orderRows = castList(data.get("orders"));
            setColumns(orderRows);
            orders.setItems(FXCollections.observableArrayList(orderRows.stream().limit(7).toList()));
            List<Map<String,Object>> alertRows = castList(data.get("alerts"));
            alerts.setItems(FXCollections.observableArrayList(alertRows.stream().limit(8)
                    .map(a -> a.getOrDefault("type", "Alerta") + " · " + a.getOrDefault("vehicleId", "") + "\n" + a.getOrDefault("message", ""))
                    .toList()));
        } catch (Exception e) {
            alerts.setItems(FXCollections.observableArrayList("No se pudo conectar con el servidor", e.getMessage()));
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String,Object>> castList(Object value) { return value instanceof List<?> list ? (List<Map<String,Object>>) list : List.of(); }
    private void setColumns(List<Map<String,Object>> rows) {
        if (rows.isEmpty()) return;
        for (String key : List.of("id", "vehicleId", "description", "status", "priority")) {
            TableColumn<Map<String,Object>,String> col = new TableColumn<>(key.equals("vehicleId") ? "Camioneta" : Character.toUpperCase(key.charAt(0))+key.substring(1));
            col.setCellValueFactory(c -> new javafx.beans.property.SimpleStringProperty(String.valueOf(c.getValue().getOrDefault(key,"—"))));
            orders.getColumns().add(col);
        }
    }
}
