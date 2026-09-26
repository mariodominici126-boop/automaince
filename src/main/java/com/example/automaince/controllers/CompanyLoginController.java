package com.example.automaince.controllers;

import com.example.automaince.application.ViewRouter;
import javafx.fxml.FXML;
import javafx.scene.control.*;

public abstract class CompanyLoginController {
    @FXML protected TextField username;
    @FXML protected PasswordField password;
    @FXML protected Label feedback;
    protected void showAuthenticationNotice(String company) {
        feedback.setText("El acceso de " + company + " aún debe conectarse a su servicio de autenticación.");
    }
    protected void backToCompanies() { ViewRouter.show("AccessPanel.fxml"); }
}
