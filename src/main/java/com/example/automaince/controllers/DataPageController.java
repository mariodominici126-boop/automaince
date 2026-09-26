package com.example.automaince.controllers;

import com.example.automaince.services.ApiClient;
import javafx.collections.FXCollections;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.control.*;
import javafx.scene.layout.HBox;

import java.util.*;

/** Shared behavior for data pages; each area still has its own FXML and controller. */
public class DataPageController {
    @FXML private Label pageTitle;
    @FXML private Label pageDescription;
    @FXML private TableView<Map<String, Object>> table;
    @FXML private HBox actions;
    private String page;
    private String endpoint;

    public void configure(String page) {
        this.page = page;
        endpoint = page;
        pageTitle.setText(switch (page) {
            case "vehicles" -> "Vehículos"; case "orders" -> "Órdenes de mantenimiento";
            case "maintenance" -> "Historial de mantenimiento"; case "fuel" -> "Combustible";
            case "repairs" -> "Reparaciones"; case "parts" -> "Catálogo de piezas";
            case "documents" -> "Documentos"; case "alerts" -> "Centro de alertas";
            case "analytics" -> "Analytics"; case "intelligence" -> "AutoMaince Intelligence";
            default -> page;
        });
        pageDescription.setText("Información compartida con la aplicación web a través del servidor AutoMaince.");
        if (page.equals("vehicles")) pageDescription.setText("Consulta y registra vehículos de la flota.");
        if (page.equals("orders")) pageDescription.setText("Crea órdenes y avanza su estado en el flujo de mantenimiento.");
        if (actions != null) actions.getChildren().clear();
        if (Set.of("vehicles", "orders", "maintenance", "fuel").contains(page)) {
            Button add = new Button(switch (page) { case "vehicles" -> "+ Agregar vehículo"; case "orders" -> "+ Crear orden"; case "maintenance" -> "+ Registrar mantenimiento"; default -> "+ Registrar carga"; });
            add.setStyle("-fx-background-color: #087f79; -fx-text-fill: white; -fx-font-weight: bold; -fx-padding: 9 15;");
            add.setOnAction(e -> createRecord()); actions.getChildren().add(add);
        }
        if (page.equals("orders")) {
            Button advance = new Button("Avanzar orden seleccionada");
            advance.setStyle("-fx-background-color: #e9f0f2; -fx-text-fill: #173d4c; -fx-padding: 9 15;");
            advance.setOnAction(e -> advanceOrder()); actions.getChildren().add(advance);
        }
        if (page.equals("analytics") || page.equals("intelligence")) loadObjectPage(); else refresh();
    }

    private void refresh() {
        try {
            List<Map<String, Object>> rows = ApiClient.list(endpoint);
            if (page.equals("alerts")) {
                List<Map<String, Object>> normalized = new ArrayList<>();
                for (Map<String, Object> row : rows) {
                    var copy = new LinkedHashMap<String, Object>(row);
                    if (copy.containsKey("level")) copy.put("Severidad", copy.remove("level"));
                    if (copy.containsKey("message")) copy.put("Mensaje", copy.remove("message"));
                    normalized.add(copy);
                }
                rows = normalized;
            }
            render(rows);
        } catch (Exception ex) { showError(ex); }
    }

    private void loadObjectPage() {
        try {
            Map<String, Object> result = ApiClient.object(endpoint);
            List<Map<String, Object>> rows = new ArrayList<>();
            result.forEach((key, value) -> {
                if (value instanceof List<?> list) {
                    for (Object item : list) if (item instanceof Map<?, ?> map) {
                        var row = new LinkedHashMap<String, Object>(); row.put("Grupo", key); map.forEach((k, v) -> row.put(String.valueOf(k), v)); rows.add(row);
                    }
                } else { var row = new LinkedHashMap<String, Object>(); row.put("Indicador", key); row.put("Valor", value); rows.add(row); }
            });
            render(rows);
        } catch (Exception ex) { showError(ex); }
    }

    private void render(List<Map<String, Object>> rows) {
        table.getColumns().clear();
        if (rows.isEmpty()) { table.setItems(FXCollections.observableArrayList()); return; }
        LinkedHashSet<String> keys = new LinkedHashSet<>(); rows.forEach(row -> keys.addAll(row.keySet()));
        for (String key : keys) {
            TableColumn<Map<String, Object>, String> col = new TableColumn<>(label(key));
            col.setCellValueFactory(cell -> new javafx.beans.property.SimpleStringProperty(String.valueOf(cell.getValue().getOrDefault(key, "—"))));
            col.setPrefWidth(Math.max(110, Math.min(260, key.length() * 11.0 + 55)));
            table.getColumns().add(col);
        }
        table.setItems(FXCollections.observableArrayList(rows));
    }

    private String label(String key) { return switch(key) { case "vehicleId" -> "Vehículo"; case "createdAt" -> "Creada"; case "nextMaintenance" -> "Próximo mantenimiento"; case "recentConsumption" -> "Consumo reciente"; default -> Character.toUpperCase(key.charAt(0)) + key.substring(1); }; }

    private void createRecord() {
        try {
            String formName = switch (page) { case "vehicles" -> "VehicleForm.fxml"; case "orders" -> "OrderForm.fxml"; case "maintenance" -> "MaintenanceForm.fxml"; default -> "FuelForm.fxml"; };
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/example/automaince/Vistas/Forms/" + formName));
            Parent form = loader.load();
            Dialog<Map<String,Object>> dialog = new Dialog<>();
            dialog.setTitle(switch(page) { case "vehicles" -> "Agregar vehículo"; case "orders" -> "Crear orden de mantenimiento"; case "maintenance" -> "Registrar mantenimiento"; default -> "Registrar carga de combustible"; });
            dialog.getDialogPane().getButtonTypes().addAll(ButtonType.CANCEL, ButtonType.OK);
            dialog.getDialogPane().setContent(form);
            dialog.setResultConverter(button -> {
                if (button != ButtonType.OK) return null;
                return switch (page) {
                    case "vehicles" -> ((VehicleFormController) loader.getController()).data();
                    case "orders" -> ((OrderFormController) loader.getController()).data();
                    case "maintenance" -> ((MaintenanceFormController) loader.getController()).data();
                    default -> ((FuelFormController) loader.getController()).data();
                };
            });
            Optional<Map<String,Object>> data = dialog.showAndWait();
            if (data.isPresent()) { ApiClient.create(endpoint, data.get()); refresh(); }
        } catch (Exception ex) { showError(ex); }
    }

    private void advanceOrder() {
        var row = table.getSelectionModel().getSelectedItem();
        if (row == null) { showError(new IllegalStateException("Selecciona una orden primero.")); return; }
        try { ApiClient.patch("orders/" + row.get("id")); refresh(); } catch (Exception ex) { showError(ex); }
    }

    private void showError(Exception ex) {
        var alert = new Alert(Alert.AlertType.ERROR); alert.setTitle("AutoMaince");
        alert.setHeaderText("No se pudo completar la operación"); alert.setContentText(ex.getMessage()); alert.showAndWait();
    }
}
