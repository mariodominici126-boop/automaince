package com.example.automaince.controllers;

import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Node;
import javafx.scene.control.Alert;
import javafx.scene.control.Label;
import javafx.scene.layout.StackPane;

public class MainController {
    @FXML private StackPane pageHost;
    @FXML private Label connectionStatus;

    @FXML private void initialize() { show("dashboard"); }
    @FXML private void dashboard() { show("dashboard"); }
    @FXML private void vehicles() { show("vehicles"); }
    @FXML private void orders() { show("orders"); }
    @FXML private void maintenance() { show("maintenance"); }
    @FXML private void repairs() { show("repairs"); }
    @FXML private void parts() { show("parts"); }
    @FXML private void documents() { show("documents"); }
    @FXML private void alerts() { show("alerts"); }
    @FXML private void analytics() { show("analytics"); }
    @FXML private void intelligence() { show("intelligence"); }

    private void show(String page) {
        try {
            String viewName = switch (page) {
                case "dashboard" -> "DashboardView.fxml";
                case "vehicles" -> "VehiclesView.fxml";
                case "orders" -> "OrdersView.fxml";
                case "maintenance" -> "MaintenanceView.fxml";
                case "repairs" -> "RepairsView.fxml";
                case "parts" -> "PartsView.fxml";
                case "documents" -> "DocumentsView.fxml";
                case "alerts" -> "AlertsView.fxml";
                case "analytics" -> "AnalyticsView.fxml";
                default -> "IntelligenceView.fxml";
            };
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/example/automaince/Vistas/" + viewName));
            Node view = loader.load();
            pageHost.getChildren().setAll(view);
            connectionStatus.setText("Conectado al servidor web");
        } catch (Exception e) {
            connectionStatus.setText("Servidor no disponible");
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle("No se pudo cargar la información");
            alert.setHeaderText("Verifica que el servidor web esté iniciado");
            alert.setContentText(e.getMessage());
            alert.showAndWait();
        }
    }
}
