module com.example.automaince {
    requires javafx.controls;
    requires javafx.fxml;
    requires javafx.web;

    requires org.kordamp.bootstrapfx.core;
    requires java.net.http;
    requires com.fasterxml.jackson.databind;

    opens com.example.automaince.controllers to javafx.fxml;
    opens com.example.automaince.companies.gtg to javafx.fxml;
    opens com.example.automaince.companies.notions to javafx.fxml;
    opens com.example.automaince.companies.nowlogistics to javafx.fxml;
    opens com.example.automaince.companies.printpilot to javafx.fxml;
    exports com.example.automaince.application;
    exports com.example.automaince.controllers;
}


