package com.example.automaince.companies.printpilot;
import com.example.automaince.controllers.CompanyLoginController;
import javafx.fxml.FXML;
public class PrintPilotLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("PrintPilot"); } @FXML private void back() { backToCompanies(); } }


