import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgxPaginationModule } from 'ngx-pagination';
import { NgHttpLoaderModule } from 'ng-http-loader';
import { AngularSplitModule } from 'angular-split';
import { MatTableModule } from '@angular/material/table';

import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AppRoutingModule } from './app-routing.module';
import { HeaderComponent } from './components/header/header.component';
import { UploadsComponent } from './pages/uploads/uploads.component';
import { AlluploadsComponent } from './components/alluploads/alluploads.component';
import { ReadyForReviewComponent } from './components/ready-for-review/ready-for-review.component';
import { SortingButtonComponent } from './components/sorting-button/sorting-button.component';
import { ReadyForRpaComponent } from './pages/ready-for-rpa/ready-for-rpa.component';
import { UploadsOverviewComponent } from './components/uploads-overview/uploads-overview.component';
import { InvoiceFormComponent } from './components/invoice-form/invoice-form.component';
import { ReadyPostCardsComponent } from './components/ready-post-cards/ready-post-cards.component';
import { AccuracyOfInvoiceProcessComponent } from './components/accuracy-of-invoice-process/accuracy-of-invoice-process.component';
import { UploadFileComponent } from './components/upload-file/upload-file.component';
// Services
import { DataService } from './services/data.service';
import { AuthService } from './services/auth.service';
import { UrlService } from './services/url.service';
import { PaymentInvoiceComponent } from './components/payment-invoice/payment-invoice.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { VendorNameComponent } from './components/vendor-name/vendor-name.component';
import { UploadListComponent } from './components/upload-list/upload-list.component';

// Third Party
import { NgxImageZoomModule } from 'ngx-image-zoom';
import { ErrorComponent } from './components/error/error.component';
import { FilterComponent } from './components/filter/filter.component';
import { BlobModule } from 'angular-azure-blob-service';
import { DeleteAlertComponent } from './components/delete-alert/delete-alert.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ng6-toastr-notifications';
import { ChartService } from './services/chart.service';
import { ImageZoomComponent } from './components/image-zoom/image-zoom.component';

// Pipes
import { UnderScoreToSpacePipe } from './pipes/underscoreToSpace.pipe';
import { PrettifyTime } from './pipes/prettifyTime.pipe';
import { SuspiciousSymbolsPipe } from './pipes/suspiciousSymbols.pipe';
import { DashboardStatsPipe } from './pipes/dashboardStats.pipe';
import { DecimalPipe } from '@angular/common';
import { KeysPipe } from './pipes/keys.pipe';

// Charts
import { ChartComponent } from './components/chart/chart.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { ModalModifyVendorComponent } from './components/modal-modify-vendor/modal-modify-vendor.component';
import { ModalModifyUserComponent } from './components/modal-modify-user/modal-modify-user.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ChangePasswordComponent } from './components/change-password/change-password.component';
import { ProfileDetailsComponent } from './components/profile-details/profile-details.component';
import { VendorSettingsComponent } from './components/vendor-settings/vendor-settings.component';
import { UserSettingsComponent } from './components/user-settings/user-settings.component';
import { OrderByPipe } from './pipes/order-by.pipe';
import { UserVendorRelationshipComponent } from './components/user-vendor-relationship/user-vendor-relationship.component';
import { XmlMappingComponent } from './components/xml-mapping/xml-mapping.component';
import { DecimalPrettyPipe } from './pipes/decimal-pretty.pipe';
import { ForbiddenComponent } from './pages/forbidden/forbidden.component';
import { SignupComponent } from './components/signup/signup.component';
import { TokenInterceptorService } from './services/token-service-Interceptor';
import { CustomDiaogComponent } from './components/custom-diaog/custom-diaog.component';
import { PhoneMaskDirective } from './directives/phone-masking';
import { StickyPopoverDirective } from './directives/sticky-popover.directive';
import { ScrollableDirective } from './directives/scrollable.directive';
import { ThankyouComponent } from './components/thankyou/thankyou.component';
import { CheckEmailComponent } from './components/check-email/check-email.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { WelcomeComponent } from './components/welcome/welcome.component';
import { EmailVerificationComponent } from './components/email-verification/email-verification.component';
import { MatCardModule, MatProgressSpinnerModule, MatProgressBarModule, MatFormFieldModule, MatSlideToggleModule, MatInputModule, MatSelectModule, MatRadioModule, MatChipsModule, MatAutocompleteModule, MatIconModule, MatCheckboxModule, MatBadgeModule, MatPaginatorModule, MatSortModule } from '@angular/material';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { DemoInstuctionsComponent } from './components/demo-instuctions/demo-instuctions.component';
import { DemoCopyrightComponent } from './components/demo-copyright/demo-copyright.component';
import { ModalModifyViewComponent } from './components/modal-modify-view/modal-modify-view.component';
import { FaqComponent } from './components/faq/faq.component';
import { ManuallyCorrectedDocListComponent } from './components/extraction-assist/FormatIdentifier/manuallyCorrected-doclist/manuallyCorrected-doclist.component';
import { RuleMasterdataSuggestionComponent } from './components/extraction-assist/FormatIdentifier/rule-masterdata-suggestion/rule-masterdata-suggestion.component';
import { RuleMasterdataCreationComponent } from './components/extraction-assist/FormatIdentifier/rule-masterdata-creation/rule-masterdata-creation.component';
import { ExtractionAssistRootComponent } from './components/extraction-assist/extraction-assist-root.component';
import { FieldSelectionComponent } from './components/extraction-assist/FormatIdentifier/field-selection/field-selectioncomponent';
import { DocumentListComponent } from './components/extraction-assist/FormatIdentifier/document-list/document-list.component';
import { TemplateCreationComponent } from './components/extraction-assist/PathFinder/template-creation/template-creation.component';
import { TemplateTestingComponent } from './components/extraction-assist/PathFinder/template-testing/template-testing.component';
import { TestingDocumentsListComponent } from './components/extraction-assist/PathFinder/testing-documents-list/testing-documents-list.component';
import { TestingDocDetailviewComponent } from './components/extraction-assist/PathFinder/testing-doc-detailview/testing-doc-detailview.component';
import { TestingDetailRightViewComponent } from './components/extraction-assist/PathFinder/testing-detail-right-view/testing-detail-right-view.component';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { InfoDialogComponent } from './components/info-dialog/info-dialog.component';
import { ReviewerDialogComponent } from './components/reviewer-dialog/reviewer-dialog.component';
import { NgxSpinnerModule } from 'ngx-spinner';
import { MultiSelectDropdownComponent } from './components/multi-select-dropdown/multi-select-dropdown.component';
import { RulesViewComponent } from './components/extraction-assist/FormatIdentifier/rules-view/rules-view.component';
import { MlIdentifierViewComponent } from './components/extraction-assist/FormatIdentifier/ml-identifier-view/ml-identifier-view.component';
import { ApproverDialogComponent } from './components/approver-dialog/approver-dialog.component';
import { DashboardNewComponent } from './pages/dashboard-new/dashboard-new.component';
import { ChartNewComponent } from './components/chart-new/chart-new.component';
import { DashboardNewFiltersComponent } from './components/dashboard-new-filters/dashboard-new-filters.component';
import { DashboardNewDisabledGraphsComponent } from './components/dashboard-new-disabled-graphs/dashboard-new-disabled-graphs.component';
import { DashboardNewTableComponent } from './components/dashboard-new-table/dashboard-new-table.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DashboardComponent,
    HeaderComponent,
    UploadsComponent,
    AlluploadsComponent,
    ReadyForReviewComponent,
    SortingButtonComponent,
    ReadyForRpaComponent,
    UploadsOverviewComponent,
    InvoiceFormComponent,
    ReadyPostCardsComponent,
    AccuracyOfInvoiceProcessComponent,
    PaymentInvoiceComponent,
    VendorNameComponent,
    UploadListComponent,
    UploadFileComponent,
    ErrorComponent,
    FilterComponent,
    DeleteAlertComponent,
    UnderScoreToSpacePipe,
    PrettifyTime,
    SuspiciousSymbolsPipe,
    DashboardStatsPipe,
    ImageZoomComponent,
    ChartComponent,
    SettingsComponent,
    ModalModifyVendorComponent,
    ModalModifyUserComponent,
    ProfileComponent,
    ChangePasswordComponent,
    ProfileDetailsComponent,
    VendorSettingsComponent,
    UserSettingsComponent,
    OrderByPipe,
    UserVendorRelationshipComponent,
    XmlMappingComponent,
    DecimalPrettyPipe,
    ForbiddenComponent,
    SignupComponent,
    CustomDiaogComponent,
    PhoneMaskDirective,
    StickyPopoverDirective,
    ThankyouComponent,
    CheckEmailComponent,
    ResetPasswordComponent,
    WelcomeComponent,
    EmailVerificationComponent,
    DemoInstuctionsComponent,
    DemoCopyrightComponent,
    ModalModifyViewComponent,
    FaqComponent,
    ManuallyCorrectedDocListComponent,
    FieldSelectionComponent,
    RuleMasterdataSuggestionComponent,
    RuleMasterdataCreationComponent,
    ExtractionAssistRootComponent,
    DocumentListComponent,
    TemplateCreationComponent,
    ScrollableDirective,
    TemplateTestingComponent,
    TestingDocumentsListComponent,
    KeysPipe,
    TestingDocDetailviewComponent,
    TestingDetailRightViewComponent,
    InfoDialogComponent,
    ReviewerDialogComponent,
    MultiSelectDropdownComponent,
    RulesViewComponent,
    MlIdentifierViewComponent,
    ApproverDialogComponent,
    DashboardNewComponent,
    ChartNewComponent,
    DashboardNewFiltersComponent,
    DashboardNewDisabledGraphsComponent,
    DashboardNewTableComponent
  ],
  entryComponents: [
    DeleteAlertComponent,
    ModalModifyVendorComponent,
    ModalModifyUserComponent,
    UserVendorRelationshipComponent,
    ModalModifyViewComponent,
    InfoDialogComponent,
    ApproverDialogComponent,
    DashboardNewDisabledGraphsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    HttpClientModule,
    FormsModule,
    NgxPaginationModule,
    ReactiveFormsModule,
    NgxImageZoomModule.forRoot(),
    BlobModule.forRoot(),
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    NgHttpLoaderModule.forRoot(),
    AngularSplitModule.forRoot(),
    MatCardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatTableModule,
    MatSlideToggleModule,
    NgxSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatBadgeModule,
    MatPaginatorModule,
    MatSortModule,
    DragDropModule,
    NgMultiSelectDropDownModule.forRoot()
  ],
  providers: [
    DataService,
    AuthService,
    ChartService,
    PrettifyTime,
    UnderScoreToSpacePipe,
    DashboardStatsPipe,
    DecimalPipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptorService,
      multi: true
    },
    UrlService
  ],
  exports: [
    PhoneMaskDirective
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
