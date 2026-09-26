package com.example.automaince.application;

import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.stage.Stage;

public final class ViewRouter {
    private static Stage stage;
    private ViewRouter() {}
    public static void initialize(Stage primaryStage) { stage = primaryStage; }
    public static void show(String viewFile) {
        try {
            Parent view = new FXMLLoader(HelloApplication.class.getResource("/com/example/automaince/Vistas/" + viewFile)).load();
            stage.getScene().setRoot(view);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo abrir la pantalla " + viewFile, e);
        }
    }
}
