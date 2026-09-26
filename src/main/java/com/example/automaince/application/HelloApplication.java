package com.example.automaince.application;

import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.StackPane;
import javafx.scene.web.WebView;
import javafx.stage.Stage;

public class HelloApplication extends Application {
    private static final String DEFAULT_WEB_URL = "https://automaince.onrender.com";

    @Override public void start(Stage stage) throws Exception {
        String webUrl = System.getProperty("automaince.web",
                System.getenv().getOrDefault("AUTOMAINCE_WEB_URL", DEFAULT_WEB_URL));
        WebView webView = new WebView();
        webView.getEngine().setJavaScriptEnabled(true);
        webView.getEngine().load(webUrl);

        stage.setTitle("AutoMaince · Gestión de flotas");
        stage.setMinWidth(900);
        stage.setMinHeight(620);
        stage.setScene(new Scene(new StackPane(webView), 1280, 820));
        stage.show();
    }
}
