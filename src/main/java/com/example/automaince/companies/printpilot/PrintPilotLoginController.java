package com.example.automaince.controllers;
import javafx.fxml.FXML;
public class PrintPilotLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("PrintPilot"); } @FXML private void back() { backToCompanies(); } }
