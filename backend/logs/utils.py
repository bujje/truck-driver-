"""
Utility functions for ELD log generation
"""
import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


class LogGenerator:
    """
    Class for generating ELD log sheets
    """
    # Constants for log sheet
    HOURS_IN_DAY = 24
    GRID_HEIGHT = 4  # 4 duty statuses
    
    # Duty status indices
    OFF_DUTY = 0
    SLEEPER_BERTH = 1
    DRIVING = 2
    ON_DUTY = 3
    
    @staticmethod
    def generate_log_sheet_data(trip, date, status_changes):
        """
        Generate log sheet data for a specific date
        
        Args:
            trip: Trip object
            date: Date for the log sheet
            status_changes: List of duty status changes for the date
            
        Returns:
            Dictionary with log sheet data
        """
        # Initialize grid with all cells empty
        grid = [[None for _ in range(LogGenerator.HOURS_IN_DAY)] for _ in range(LogGenerator.GRID_HEIGHT)]
        
        # Fill grid based on status changes
        for change in status_changes:
            if change.start_time.date() != date:
                continue
                
            start_hour = change.start_time.hour
            
            # Calculate end hour
            if change.end_time and change.end_time.date() == date:
                end_hour = change.end_time.hour
                # Add partial hour if minutes > 0
                if change.end_time.minute > 0:
                    end_hour += 1
            else:
                # If no end time or end time is on next day, use end of day
                end_hour = LogGenerator.HOURS_IN_DAY
            
            # Map status to grid row
            if change.status == 'off_duty':
                row = LogGenerator.OFF_DUTY
            elif change.status == 'sleeper_berth':
                row = LogGenerator.SLEEPER_BERTH
            elif change.status == 'driving':
                row = LogGenerator.DRIVING
            elif change.status == 'on_duty':
                row = LogGenerator.ON_DUTY
            else:
                continue
            
            # Fill grid cells
            for hour in range(start_hour, end_hour):
                grid[row][hour] = 1
        
        # Calculate hours by duty status
        hours_by_status = {
            'off_duty': sum(1 for cell in grid[LogGenerator.OFF_DUTY] if cell),
            'sleeper_berth': sum(1 for cell in grid[LogGenerator.SLEEPER_BERTH] if cell),
            'driving': sum(1 for cell in grid[LogGenerator.DRIVING] if cell),
            'on_duty': sum(1 for cell in grid[LogGenerator.ON_DUTY] if cell),
        }
        
        # Get location remarks
        location_remarks = []
        for change in status_changes:
            if change.start_time.date() == date:
                location_remarks.append({
                    'time': change.start_time.strftime('%H:%M'),
                    'location': change.location,
                    'status': change.get_status_display()
                })
        
        return {
            'date': date,
            'grid': grid,
            'hours_by_status': hours_by_status,
            'total_hours': sum(hours_by_status.values()),
            'location_remarks': location_remarks
        }
    
    @staticmethod
    def generate_pdf(log_sheet, driver_info):
        """
        Generate PDF for a log sheet
        
        Args:
            log_sheet: LogSheet object with status_changes
            driver_info: Dictionary with driver information
            
        Returns:
            PDF file as bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []
        
        # Title
        title_style = styles['Heading1']
        title = Paragraph(f"Driver's Daily Log - {log_sheet.date.strftime('%m/%d/%Y')}", title_style)
        elements.append(title)
        elements.append(Spacer(1, 0.25*inch))
        
        # Driver information
        driver_info_style = styles['Normal']
        driver_info_text = f"""
        Driver: {driver_info.get('name', 'N/A')}
        Driver ID: {driver_info.get('id', 'N/A')}
        Vehicle #: {log_sheet.vehicle_number or 'N/A'}
        Trailer #: {log_sheet.trailer_number or 'N/A'}
        """
        driver_info_para = Paragraph(driver_info_text, driver_info_style)
        elements.append(driver_info_para)
        elements.append(Spacer(1, 0.25*inch))
        
        # Create grid header (hours)
        grid_header = ['Status'] + [f"{h:02d}" for h in range(24)]
        
        # Create grid data
        grid_data = [
            ['Off Duty'] + ['X' if cell else '' for cell in log_sheet.status_changes.filter(status='off_duty')],
            ['Sleeper'] + ['X' if cell else '' for cell in log_sheet.status_changes.filter(status='sleeper_berth')],
            ['Driving'] + ['X' if cell else '' for cell in log_sheet.status_changes.filter(status='driving')],
            ['On Duty'] + ['X' if cell else '' for cell in log_sheet.status_changes.filter(status='on_duty')],
        ]
        
        # Create grid table
        grid_table = Table([grid_header] + grid_data, colWidths=[0.8*inch] + [0.3*inch]*24)
        grid_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        elements.append(grid_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # Hours summary
        hours_summary = [
            ['Hours Summary', ''],
            ['Off Duty', sum(1 for change in log_sheet.status_changes.filter(status='off_duty'))],
            ['Sleeper Berth', sum(1 for change in log_sheet.status_changes.filter(status='sleeper_berth'))],
            ['Driving', sum(1 for change in log_sheet.status_changes.filter(status='driving'))],
            ['On Duty (Not Driving)', sum(1 for change in log_sheet.status_changes.filter(status='on_duty'))],
            ['Total Hours', sum(1 for change in log_sheet.status_changes.all())],
        ]
        
        hours_table = Table(hours_summary, colWidths=[2*inch, 1*inch])
        hours_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ]))
        elements.append(hours_table)
        elements.append(Spacer(1, 0.25*inch))
        
        # Location remarks
        remarks_header = ['Time', 'Location', 'Status']
        remarks_data = []
        
        for change in log_sheet.status_changes.all():
            remarks_data.append([
                change.start_time.strftime('%H:%M'),
                change.location,
                change.get_status_display()
            ])
        
        if remarks_data:
            remarks_table = Table([remarks_header] + remarks_data, colWidths=[1*inch, 4*inch, 2*inch])
            remarks_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ]))
            elements.append(remarks_table)
        
        # Certification
        elements.append(Spacer(1, 0.5*inch))
        certification_text = """
        I hereby certify that my entries are true and correct:
        
        Driver's Signature: _________________________ Date: _____________
        """
        certification_para = Paragraph(certification_text, styles['Normal'])
        elements.append(certification_para)
        
        # Build PDF
        doc.build(elements)
        pdf = buffer.getvalue()
        buffer.close()
        
        return pdf