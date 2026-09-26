package com.example.automaince.controllers;
import javafx.fxml.FXML;
public class GtgLoginController extends CompanyLoginController { @FXML private void login() { showAuthenticationNotice("Global Technology Group"); } @FXML private void back() { backToCompanies(); } }
