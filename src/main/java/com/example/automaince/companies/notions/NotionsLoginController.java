package com.example.automaince.companies.notions;
import com.example.automaince.controllers.CompanyLoginController;
import javafx.fxml.FXML;
public class NotionsLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("Notions Group"); } @FXML private void back() { backToCompanies(); } }


