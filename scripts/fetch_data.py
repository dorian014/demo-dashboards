#!/usr/bin/env python3
"""
Fetch Superbetin influencer metrics from Google Sheets.

This script:
1. Connects to Google Sheets using service account credentials
2. Fetches data from Facebook and Instagram/X worksheets
3. Saves combined data as JSON for the dashboard
"""

import os
import json
import re
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials

# Configuration
SERVICE_ACCOUNT_JSON = os.environ.get('GOOGLE_SERVICE_ACCOUNT')
DATA_DIR = 'data'
WORKSHEET_NAME = 'raw_data'

# Sheet IDs for each platform
SHEETS = {
    'instagram': '1V6t6GaDA7fCzIHxWfaBzn2P87pHcQ8hnqV__6fZpIBU',
    'facebook': '1CQwuMGNzc2eOAu9nvdKLvJXplnPcPkZ3XlS8XgpzBoY',
}


def setup_google_sheets():
    """Setup and authenticate Google Sheets client."""
    if not SERVICE_ACCOUNT_JSON:
        raise ValueError("GOOGLE_SERVICE_ACCOUNT environment variable not set")

    creds_dict = json.loads(SERVICE_ACCOUNT_JSON)
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    return gspread.authorize(creds)


def extract_hyperlink_url(formula):
    """Extract URL from a HYPERLINK formula like =HYPERLINK("url", "text")."""
    if not formula or not isinstance(formula, str):
        return None

    # Match =HYPERLINK("url", "text") or =HYPERLINK("url")
    match = re.match(r'=HYPERLINK\s*\(\s*"([^"]+)"', formula, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def fetch_data(client, sheet_id, platform):
    """Fetch all data from a specific sheet, extracting URLs from HYPERLINK formulas."""
    try:
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)

        # Get display values
        records = worksheet.get_all_records()
        print(f"  Fetched {len(records)} records from {platform}")

        # Get all values including formulas to extract hyperlinks
        # Find Post ID column index
        headers = worksheet.row_values(1)
        post_id_col = None
        for i, header in enumerate(headers):
            if header == 'Post ID':
                post_id_col = i + 1  # 1-indexed for gspread
                break

        if post_id_col and len(records) > 0:
            # Get formulas for Post ID column
            # Use FORMULA value render option to get actual formulas
            post_id_range = worksheet.range(2, post_id_col, len(records) + 1, post_id_col)

            # Get formulas using the acell method with formula option
            try:
                # Get all cells with formulas
                formula_cells = worksheet.get(
                    f'{gspread.utils.rowcol_to_a1(2, post_id_col)}:{gspread.utils.rowcol_to_a1(len(records) + 1, post_id_col)}',
                    value_render_option='FORMULA'
                )

                # Extract URLs and add to records
                urls_extracted = 0
                for i, record in enumerate(records):
                    if i < len(formula_cells) and formula_cells[i]:
                        cell_value = formula_cells[i][0] if isinstance(formula_cells[i], list) else formula_cells[i]
                        url = extract_hyperlink_url(cell_value)
                        if url:
                            record['Post URL'] = url
                            urls_extracted += 1
                        elif cell_value and (cell_value.startswith('http') or cell_value.startswith('www')):
                            # Plain URL without HYPERLINK formula
                            record['Post URL'] = cell_value if cell_value.startswith('http') else f'https://{cell_value}'
                            urls_extracted += 1

                if urls_extracted > 0:
                    print(f"  Extracted {urls_extracted} URLs from Post ID hyperlinks")

            except Exception as e:
                print(f"  Note: Could not extract hyperlinks: {e}")

        return records
    except gspread.exceptions.WorksheetNotFound:
        print(f"  Warning: Worksheet '{WORKSHEET_NAME}' not found in {platform} sheet")
        return []
    except Exception as e:
        print(f"  Error fetching {platform} data: {e}")
        raise


def deduplicate_by_post_id(records):
    """
    Deduplicate records by Post ID, keeping the one with highest Impressions/Views.
    This ensures we get the most up-to-date data for each post.
    """
    if not records:
        return records

    # Group by Post ID, keep record with highest Impressions/Views
    best_records = {}
    for record in records:
        post_id = record.get('Post ID')
        if not post_id:
            continue

        # Parse impressions/views as number
        impressions = record.get('Impressions/Views', 0)
        if isinstance(impressions, str):
            impressions = int(impressions.replace(',', '')) if impressions else 0

        # Keep record with highest impressions
        if post_id not in best_records:
            best_records[post_id] = (record, impressions)
        else:
            _, current_impressions = best_records[post_id]
            if impressions > current_impressions:
                best_records[post_id] = (record, impressions)

    # Extract just the records
    deduplicated = [r for r, _ in best_records.values()]

    duplicates_removed = len(records) - len(deduplicated)
    if duplicates_removed > 0:
        print(f"  Removed {duplicates_removed} duplicates (kept highest Impressions/Views)")

    return deduplicated


def save_json(data, filename):
    """Save data to JSON file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Data saved: {filepath}")


def main():
    """Main function."""
    print("Starting Superbetin data fetch...")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Setup Google Sheets client
    client = setup_google_sheets()

    # Fetch data from each platform
    all_data = {
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'platforms': {}
    }

    for platform, sheet_id in SHEETS.items():
        print(f"\nFetching {platform} data...")
        records = fetch_data(client, sheet_id, platform)

        # Deduplicate by Post ID, keeping highest Impressions/Views
        records = deduplicate_by_post_id(records)

        platform_data = {
            'sheet_id': sheet_id,
            'worksheet': WORKSHEET_NAME,
            'count': len(records),
            'data': records
        }

        all_data['platforms'][platform] = platform_data

        # Save individual platform file
        save_json({
            'generated': all_data['generated'],
            'platform': platform,
            **platform_data
        }, f'superbetin_{platform}.json')

    # Save combined data
    save_json(all_data, 'superbetin.json')

    print("\n✓ Superbetin data fetch complete!")


if __name__ == '__main__':
    main()
