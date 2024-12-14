import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
import { handler } from '../../../src/lambda/handlers/getSchools';
import { getAllSchools } from '../../../src/service/school';
import * as handlerUtil from '../../../src/lambda/handlerUtil';

jest.mock('../../../src/service/school');

describe('getSchools Handler', () => {
  const mockSchools = {
    simon_fraser_university: {
      name: 'Simon Fraser University',
      shortenedName: 'SFU',
      emailDomains: ['@sfu.ca'],
    },
    university_of_british_columbia: {
      name: 'University of British Columbia',
      shortenedName: 'UBC',
      emailDomains: ['@ubc.ca'],
    },
  };

  const invokeHandler = async (event: Partial<APIGatewayProxyEvent>) => {
    const context = {} as Context;
    const callback = {} as Callback;
    const defaultEvent = {
      headers: {},
      queryStringParameters: {},
    };
    return handler({ ...defaultEvent, ...event } as APIGatewayProxyEvent, context, callback);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (getAllSchools as jest.Mock).mockReturnValue(mockSchools);
    jest.spyOn(handlerUtil, 'successResponse');
    jest.spyOn(handlerUtil, 'errorResponse');
  });

  it('should return list of schools', async () => {
    await invokeHandler({});

    expect(getAllSchools).toHaveBeenCalled();
    expect(handlerUtil.successResponse).toHaveBeenCalledWith({
      schools: [
        {
          key: 'simon_fraser_university',
          name: 'Simon Fraser University',
          shortenedName: 'SFU',
          emailDomains: ['@sfu.ca'],
        },
        {
          key: 'university_of_british_columbia',
          name: 'University of British Columbia',
          shortenedName: 'UBC',
          emailDomains: ['@ubc.ca'],
        },
      ],
    });
  });
});
